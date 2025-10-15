import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailData, NotificationResult } from '../interfaces/notification.interface';
import { RateLimiterService } from '../../common/services/rate-limiter.service';
import { CircuitBreakerService } from '../../common/services/circuit-breaker.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private bulkTransport: Transporter;
  private liveTransport: Transporter;
  private defaultSender: { email: string; name: string };
  private rateLimitConfig: {
    perSecond: number;
    perMinute: number;
    perHour: number;
  };
  private circuitBreakerConfig = {
    failureThreshold: 5,      // Open circuit after 5 failures
    successThreshold: 3,      // Close circuit after 3 successes in HALF_OPEN
    timeout: 60000,           // Try recovery after 60 seconds
    monitoringPeriod: 300000  // Monitor failures over 5 minutes
  };

  constructor(
    private configService: ConfigService,
    private rateLimiter: RateLimiterService,
    private circuitBreaker: CircuitBreakerService
  ) {
    this.initializeTransports();
    this.initializeRateLimitConfig();
  }

  private initializeMailtrapClient() {
    // Deprecated: kept for backward compatibility. Real initialization happens in initializeTransports().
  }

  private initializeTransports() {
    const smtpUser = this.configService.get<string>('MAILTRAP_SMTP_USER') || 'api';
    const smtpPass = this.configService.get<string>('MAILTRAP_SMTP_PASS') || this.configService.get<string>('MAILTRAP_API_TOKEN') || '';

    // Bulk transport - used for bulk/phishing sends
    this.bulkTransport = nodemailer.createTransport({
      host: this.configService.get<string>('MAILTRAP_BULK_HOST') || 'bulk.smtp.mailtrap.io',
      port: this.configService.get<number>('MAILTRAP_SMTP_PORT') || 587,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Live transport - used for single sends
    this.liveTransport = nodemailer.createTransport({
      host: this.configService.get<string>('MAILTRAP_LIVE_HOST') || 'live.smtp.mailtrap.io',
      port: this.configService.get<number>('MAILTRAP_SMTP_PORT') || 587,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.defaultSender = {
      email: this.configService.get<string>('MAILTRAP_FROM_EMAIL') || 'noreply@cyber360.tech',
      name: this.configService.get<string>('MAILTRAP_FROM_NAME') || 'CyberDefend',
    };

    this.logger.log(`Nodemailer transports initialized (bulk + live) - Default sender: ${this.defaultSender.email}`);
  }

  private initializeRateLimitConfig() {
    // Initialize rate limit configuration from environment variables
    // Default values based on Mailtrap limits: https://help.mailtrap.io/article/23-smtp-sending-limits
    this.rateLimitConfig = {
      perSecond: this.configService.get<number>('EMAIL_RATE_LIMIT_PER_SECOND') || 10,
      perMinute: this.configService.get<number>('EMAIL_RATE_LIMIT_PER_MINUTE') || 100,
      perHour: this.configService.get<number>('EMAIL_RATE_LIMIT_PER_HOUR') || 1000,
    };

    this.logger.log(
      `Rate limiter initialized - ` +
      `${this.rateLimitConfig.perSecond}/sec, ` +
      `${this.rateLimitConfig.perMinute}/min, ` +
      `${this.rateLimitConfig.perHour}/hour`
    );
  }

  async sendEmail(emailData: EmailData): Promise<NotificationResult> {
    const startTime = Date.now();
    const result: NotificationResult = {
      success: false,
      timestamp: new Date(),
      attempts: 1,
    };

    try {
      if (!this.liveTransport) {
        throw new Error('Live SMTP transport not initialized');
      }

      // Check rate limit before sending
      const rateLimitResult = await this.rateLimiter.checkRateLimit('email-sending', this.rateLimitConfig);
      
      if (!rateLimitResult.allowed) {
        this.logger.warn(
          `Rate limit exceeded. Waiting ${rateLimitResult.waitTimeMs}ms before sending email. ` +
          `Current usage: ${JSON.stringify(rateLimitResult.currentUsage)}`
        );
        
        // Wait for rate limit to clear
        await this.rateLimiter.waitForRateLimit('email-sending', this.rateLimitConfig);
      }

      // Prepare recipients
      const recipients = Array.isArray(emailData.to) 
        ? emailData.to.map(email => ({ email }))
        : [{ email: emailData.to }];

      // Use custom sender if provided, otherwise use default
      const sender = {
        email: emailData.fromEmail || this.defaultSender.email,
        name: emailData.fromName || this.defaultSender.name,
      };

      // Prepare nodemailer message
      const mailOptions = {
        from: `${sender.name} <${sender.email}>`,
        to: recipients.map(r => r.email).join(', '),
        subject: emailData.subject,
        text: emailData.textContent || '',
        html: emailData.htmlContent || emailData.textContent || '',
      } as any;

      // Use live transport for single sends with circuit breaker protection
      const info = await this.circuitBreaker.execute(
        'email-smtp-live',
        async () => await this.liveTransport.sendMail(mailOptions),
        this.circuitBreakerConfig
      );

      result.success = true;
      result.messageId = info.messageId || `smtp_${Date.now()}`;
      
      const duration = Date.now() - startTime;
      this.logger.log(`Email sent successfully to ${recipients.length} recipients from ${sender.email} in ${duration}ms. MessageId: ${result.messageId}`);
      
      return result;
    } catch (error) {
      result.error = error.message;
      const duration = Date.now() - startTime;
      
      // Check for domain verification errors
      if (error.message && error.message.includes('domain') && error.message.includes('not allowed')) {
        const sender = emailData.fromEmail || this.defaultSender.email;
        const domain = sender.split('@')[1];
        this.logger.error(
          `❌ DOMAIN NOT VERIFIED: Cannot send from ${sender}. ` +
          `The domain "${domain}" must be verified in Mailtrap. ` +
          `See docs/EMAIL_DOMAIN_SETUP.md for instructions.`
        );
        this.logger.error(`Full error details:`, {
          message: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode,
          stack: error.stack
        });
      } else {
        this.logger.error(`Failed to send email to ${emailData.to} after ${duration}ms:`, error);
        this.logger.error(`Error details:`, {
          message: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode,
          stack: error.stack
        });
      }
      
      return result;
    }
  }

  async sendBulkEmails(emails: EmailData[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const batchSize = 100; // Mailtrap can handle larger batches

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // Process batch in parallel
      // For bulk batches use bulk transport directly to send messages in parallel
      const batchPromises = batch.map(async (email) => {
        // reuse sendBulkEmail for multi-recipient bulk formatting
        return this.sendEmailUsingTransport(email, this.bulkTransport);
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  private async sendEmailUsingTransport(emailData: EmailData, transport: Transporter): Promise<NotificationResult> {
    const startTime = Date.now();
    const result: NotificationResult = {
      success: false,
      timestamp: new Date(),
      attempts: 1,
    };

    try {
      if (!transport) {
        throw new Error('SMTP transport not initialized');
      }

      const recipients = Array.isArray(emailData.to)
        ? emailData.to.map(email => ({ email }))
        : [{ email: emailData.to }];

      const sender = {
        email: emailData.fromEmail || this.defaultSender.email,
        name: emailData.fromName || this.defaultSender.name,
      };

      const mailOptions = {
        from: `${sender.name} <${sender.email}>`,
        to: recipients.map(r => r.email).join(', '),
        subject: emailData.subject,
        text: emailData.textContent || '',
        html: emailData.htmlContent || emailData.textContent || '',
      } as any;

      const info = await transport.sendMail(mailOptions);

      result.success = true;
      result.messageId = info.messageId || `smtp_${Date.now()}`;

      const duration = Date.now() - startTime;
      this.logger.log(`Email sent successfully to ${recipients.length} recipients from ${sender.email} in ${duration}ms. MessageId: ${result.messageId}`);

      return result;
    } catch (error) {
      result.error = error.message;
      const duration = Date.now() - startTime;

      this.logger.error(`Failed to send email to ${emailData.to} after ${duration}ms:`, error);
      this.logger.error(`Error details:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack
      });

      return result;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.liveTransport || !this.bulkTransport) {
        return false;
      }

      // Send a simple test message via live transport
      const info = await this.liveTransport.sendMail({
        from: `${this.defaultSender.name} <${this.defaultSender.email}>`,
        to: this.defaultSender.email,
        subject: 'SMTP Connection Test',
        text: 'This is a test email to verify SMTP connection.',
      });

      this.logger.log('SMTP connection test successful', info.messageId);
      return true;
    } catch (error) {
      this.logger.error('Mailtrap connection test failed:', error);
      this.logger.error(`Error details:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack
      });
      return false;
    }
  }

  // Method for sending single bulk operation with multiple recipients
  async sendBulkEmail(
    subject: string,
    content: string,
    recipients: string[],
    isHtml: boolean = false,
    category: string = 'Bulk Email',
    fromEmail?: string,
    fromName?: string
  ): Promise<NotificationResult> {
    const startTime = Date.now();
    const result: NotificationResult = {
      success: false,
      timestamp: new Date(),
      attempts: 1,
    };

    try {
      if (!this.bulkTransport) {
        throw new Error('Bulk SMTP transport not initialized');
      }

      // Check rate limit before sending (using bulk-email-sending bucket)
      const rateLimitResult = await this.rateLimiter.checkRateLimit('bulk-email-sending', this.rateLimitConfig);
      
      if (!rateLimitResult.allowed) {
        this.logger.warn(
          `Bulk email rate limit exceeded. Waiting ${rateLimitResult.waitTimeMs}ms before sending. ` +
          `Recipients: ${recipients.length}, Current usage: ${JSON.stringify(rateLimitResult.currentUsage)}`
        );
        
        // Wait for rate limit to clear
        await this.rateLimiter.waitForRateLimit('bulk-email-sending', this.rateLimitConfig);
      }

      const recipientList = recipients;

      const sender = {
        email: fromEmail || this.defaultSender.email,
        name: fromName || this.defaultSender.name,
      };

      const mailOptions = {
        from: `${sender.name} <${sender.email}>`,
        to: recipientList.join(', '),
        subject,
        text: isHtml ? this.stripHtml(content) : content,
        html: isHtml ? content : this.createHtmlFromText(content),
      } as any;

      // Use bulk transport with circuit breaker protection
      const info = await this.circuitBreaker.execute(
        'email-smtp-bulk',
        async () => await this.bulkTransport.sendMail(mailOptions),
        this.circuitBreakerConfig
      );

      result.success = true;
      result.messageId = info.messageId || `smtp_bulk_${Date.now()}`;

      const duration = Date.now() - startTime;
      this.logger.log(`Bulk email sent successfully to ${recipients.length} recipients from ${sender.email} in ${duration}ms. MessageId: ${result.messageId}`);

      return result;
    } catch (error) {
      result.error = error.message;
      const duration = Date.now() - startTime;

      this.logger.error(`Failed to send bulk email to ${recipients.length} recipients after ${duration}ms:`, error);
      this.logger.error(`Error details:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack
      });

      return result;
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private createHtmlFromText(text: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>CyberDefend Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>CyberDefend</h2>
            </div>
            <div class="content">
              ${text.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>This email was sent by CyberDefend 360 Platform</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}