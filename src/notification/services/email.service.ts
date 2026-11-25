import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailData, NotificationResult } from '../interfaces/notification.interface';
import { RateLimiterService } from '../../common/services/rate-limiter.service';
import { CircuitBreakerService } from '../../common/services/circuit-breaker.service';
import { EmailTrackingService } from '../../common/services/email-tracking.service';

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
    private circuitBreaker: CircuitBreakerService,
    private emailTracking: EmailTrackingService
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

    // Log email preparation details
    const recipients = Array.isArray(emailData.to)
      ? emailData.to.map(email => ({ email }))
      : [{ email: emailData.to }];

    this.logger.log(`📧 Preparing email: ${emailData.subject} to ${recipients.length} recipient(s)`);
    this.logger.debug(`Email details:`, {
      from: emailData.fromEmail || 'default',
      to: recipients.map(r => r.email),
      subject: emailData.subject,
      hasHtml: !!emailData.htmlContent,
      hasText: !!emailData.textContent,
      category: emailData.category || 'email',
      contentLength: emailData.htmlContent?.length || emailData.textContent?.length || 0
    });

    try {
      if (!this.liveTransport) {
        throw new Error('Live SMTP transport not initialized');
      }

      // Use custom sender if provided, otherwise use default
      let senderEmail = emailData.fromEmail || this.defaultSender.email;
      const senderName = emailData.fromName || this.defaultSender.name;
      const originalEmail = senderEmail;

      // Domain masking: Override unverified domains with verified domain
      const domainMaskingEnabled = this.configService.get<boolean>('EMAIL_DOMAIN_MASKING_ENABLED', true);
      if (domainMaskingEnabled) {
        const verifiedDomain = this.configService.get<string>('MAILTRAP_VERIFIED_DOMAIN') || 'cyber360.tech';
        const senderDomain = senderEmail.split('@')[1];

        // Check if domain is not verified (not in allowed list)
        const allowedDomains = this.configService.get<string>('ALLOWED_SENDER_DOMAINS', verifiedDomain).split(',');

        this.logger.debug(`Domain masking check: sender=${senderEmail}, domain=${senderDomain}, allowed=${allowedDomains.join(',')}, verified=${verifiedDomain}`);

        if (!allowedDomains.includes(senderDomain)) {
          // Mask the domain while preserving sender name
          const emailUser = senderEmail.split('@')[0];
          senderEmail = `${emailUser}@${verifiedDomain}`;

          this.logger.log(
            `🎭 Domain masked: ${originalEmail} → ${senderEmail} (unverified domain: ${senderDomain})`
          );
          this.logger.debug(`Domain masking config: enabled=${domainMaskingEnabled}, verifiedDomain=${verifiedDomain}, allowedDomains=${allowedDomains.join(',')}`);
        } else {
          this.logger.debug(`✅ Domain verified: ${senderDomain} is in allowed domains list, no masking needed`);
        }
      } else {
        this.logger.debug(`Domain masking disabled, using original sender: ${senderEmail}`);
      }

      const sender = {
        email: senderEmail,
        name: senderName,
      };

      // Create tracking record and inject pixel if HTML content exists
      let finalHtmlContent = emailData.htmlContent || emailData.textContent || '';
      let trackingId: string | null = null;

      if (finalHtmlContent && this.configService.get<boolean>('EMAIL_TRACKING_ENABLED', true)) {
        try {
          // Create tracking record for each recipient
          const recipientEmail = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;
          trackingId = await this.emailTracking.createTracking({
            recipientEmail,
            emailSubject: emailData.subject,
            emailType: emailData.category || 'email',
            metadata: { sender: sender.email, recipients: recipients.length },
          });

          // Inject tracking pixel into HTML content
          const baseUrl = this.configService.get<string>('APP_URL');
          finalHtmlContent = this.emailTracking.injectTrackingPixel(finalHtmlContent, trackingId, baseUrl);
          
          this.logger.log(`Injected tracking pixel for email to ${recipientEmail} with tracking ID: ${trackingId}`);
        } catch (error) {
          this.logger.warn('Failed to create email tracking, proceeding without tracking:', error);
        }
      }

      // Prepare nodemailer message
      const mailOptions = {
        from: `${sender.name} <${sender.email}>`,
        to: recipients.map(r => r.email).join(', '),
        subject: emailData.subject,
        text: emailData.textContent || '',
        html: finalHtmlContent,
      } as any;

      // Add Reply-To header if domain was masked
      if (originalEmail !== sender.email) {
        mailOptions.replyTo = `${senderName} <${originalEmail}>`;
        this.logger.log(`📧 Reply-To set to: ${originalEmail}`);
      }

      // Log transport selection and circuit breaker usage
      this.logger.debug(`Using live transport with circuit breaker protection for single email send`);
      this.logger.debug(`Circuit breaker config: failureThreshold=${this.circuitBreakerConfig.failureThreshold}, timeout=${this.circuitBreakerConfig.timeout}ms`);

      // Use live transport for single sends with circuit breaker protection
      const info = await this.circuitBreaker.execute(
        'email-smtp-live',
        async () => await this.liveTransport.sendMail(mailOptions),
        this.circuitBreakerConfig
      );

      result.success = true;
      result.messageId = info.messageId || `smtp_${Date.now()}`;
      result.trackingId = trackingId;
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Email sent successfully to ${recipients.length} recipients from ${sender.email} in ${duration}ms. MessageId: ${result.messageId}`);
      this.logger.debug(`Email send metrics:`, {
        duration,
        recipients: recipients.length,
        messageId: result.messageId,
        trackingId,
        masked: originalEmail !== sender.email,
        transport: 'live'
      });
      
      return result;
    } catch (error) {
      result.error = error.message;
      const duration = Date.now() - startTime;

      // Categorize and log errors with actionable information
      const errorCategory = this.categorizeEmailError(error);
      const senderEmail = emailData.fromEmail || this.defaultSender.email;
      const errorContext = {
        duration,
        recipients: recipients.length,
        sender: senderEmail,
        subject: emailData.subject,
        transport: 'live',
        category: errorCategory
      };

      this.logger.error(`❌ Email send failed [${errorCategory}]: ${error.message}`, errorContext);

      // Log specific error types with actionable guidance
      switch (errorCategory) {
        case 'DOMAIN_VERIFICATION':
          const sender = emailData.fromEmail || this.defaultSender.email;
          const domain = sender.split('@')[1];
          this.logger.error(
            `🔧 ACTION REQUIRED: Domain "${domain}" needs verification in Mailtrap. ` +
            `See docs/EMAIL_DOMAIN_SETUP.md for setup instructions.`
          );
          break;

        case 'AUTHENTICATION':
          this.logger.error(
            `🔧 ACTION REQUIRED: SMTP authentication failed. Check MAILTRAP_SMTP_USER and MAILTRAP_SMTP_PASS.`
          );
          break;

        case 'RATE_LIMIT':
          this.logger.error(
            `⏱️ RATE LIMITED: Email sending rate limit exceeded. Consider increasing limits or implementing queuing.`
          );
          break;

        case 'NETWORK':
          this.logger.error(
            `🌐 NETWORK ERROR: Connection to Mailtrap failed. Check network connectivity and Mailtrap service status.`
          );
          break;

        case 'CIRCUIT_BREAKER':
          this.logger.error(
            `🔌 CIRCUIT BREAKER: Email service temporarily unavailable. Will retry automatically.`
          );
          break;

        default:
          this.logger.error(`⚠️ UNEXPECTED ERROR: Unknown error type encountered during email sending.`);
      }

      // Log full error details for debugging
      this.logger.debug(`Full error details:`, {
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

  async sendBulkEmails(emails: EmailData[]): Promise<NotificationResult[]> {
    const startTime = Date.now();
    const results: NotificationResult[] = [];
    const batchSize = 100; // Mailtrap can handle larger batches

    this.logger.log(`📧📦 Preparing bulk email send: ${emails.length} emails in batches of ${batchSize}`);

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(emails.length / batchSize);

      this.logger.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);
      
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

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    this.logger.log(`✅ Bulk email send completed: ${successCount}/${results.length} successful in ${totalDuration}ms`);
    if (failureCount > 0) {
      this.logger.warn(`⚠️ Bulk email send: ${failureCount} failures out of ${results.length} total emails`);
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

    // Define recipients at method level for error logging
    const recipients = Array.isArray(emailData.to) 
      ? emailData.to.map(email => ({ email }))
      : [{ email: emailData.to }];

    try {
      if (!transport) {
        throw new Error('SMTP transport not initialized');
      }

      // Domain masking for bulk emails
      let senderEmail = emailData.fromEmail || this.defaultSender.email;
      const senderName = emailData.fromName || this.defaultSender.name;
      const originalEmail = senderEmail;

      const domainMaskingEnabled = this.configService.get<boolean>('EMAIL_DOMAIN_MASKING_ENABLED', true);
      if (domainMaskingEnabled) {
        const verifiedDomain = this.configService.get<string>('MAILTRAP_VERIFIED_DOMAIN') || 'cyber360.tech';
        const senderDomain = senderEmail.split('@')[1];
        const allowedDomains = this.configService.get<string>('ALLOWED_SENDER_DOMAINS', verifiedDomain).split(',');
        
        if (!allowedDomains.includes(senderDomain)) {
          const emailUser = senderEmail.split('@')[0];
          senderEmail = `${emailUser}@${verifiedDomain}`;
          
          this.logger.log(
            `🎭 [Bulk] Domain masked: ${originalEmail} → ${senderEmail} (unverified domain: ${senderDomain})`
          );
        }
      }

      const sender = {
        email: senderEmail,
        name: senderName,
      };

      // Create tracking record and inject pixel if HTML content exists
      let finalHtmlContent = emailData.htmlContent || emailData.textContent || '';
      let trackingId: string | null = null;

      if (finalHtmlContent && this.configService.get<boolean>('EMAIL_TRACKING_ENABLED', true)) {
        try {
          const recipientEmail = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;
          trackingId = await this.emailTracking.createTracking({
            recipientEmail,
            emailSubject: emailData.subject,
            emailType: emailData.category || 'bulk-email',
            metadata: { sender: sender.email, recipients: recipients.length },
          });

          const baseUrl = this.configService.get<string>('APP_URL');
          finalHtmlContent = this.emailTracking.injectTrackingPixel(finalHtmlContent, trackingId, baseUrl);
          
          this.logger.log(`Injected tracking pixel for bulk email to ${recipientEmail} with tracking ID: ${trackingId}`);
        } catch (error) {
          this.logger.warn('Failed to create email tracking for bulk send, proceeding without tracking:', error);
        }
      }

      const mailOptions = {
        from: `${sender.name} <${sender.email}>`,
        to: recipients.map(r => r.email).join(', '),
        subject: emailData.subject,
        text: emailData.textContent || '',
        html: finalHtmlContent,
      } as any;

      // Add Reply-To header if domain was masked
      if (originalEmail !== sender.email) {
        mailOptions.replyTo = `${senderName} <${originalEmail}>`;
      }

      const info = await transport.sendMail(mailOptions);

      result.success = true;
      result.messageId = info.messageId || `smtp_${Date.now()}`;
      result.trackingId = trackingId;

      const duration = Date.now() - startTime;
      this.logger.log(`Email sent successfully to ${recipients.length} recipients from ${sender.email} in ${duration}ms. MessageId: ${result.messageId}`);

      return result;
    } catch (error) {
      result.error = error.message;
      const duration = Date.now() - startTime;

      // Categorize and log bulk email errors
      const errorCategory = this.categorizeEmailError(error);
      const senderEmail = emailData.fromEmail || this.defaultSender.email;
      const errorContext = {
        duration,
        recipients: recipients.length,
        sender: senderEmail,
        subject: emailData.subject,
        transport: 'bulk',
        category: errorCategory
      };

      this.logger.error(`❌ Bulk email send failed [${errorCategory}]: ${error.message}`, errorContext);

      // Log actionable guidance for bulk email errors
      if (errorCategory === 'DOMAIN_VERIFICATION') {
        this.logger.error(
          `🔧 ACTION REQUIRED: Domain verification needed for bulk send. Check domain setup.`
        );
      }

      this.logger.debug(`Bulk email error details:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
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
    _category: string = 'Bulk Email',
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

  private categorizeEmailError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';

    // Domain verification errors
    if (message.includes('domain') && (message.includes('not allowed') || message.includes('not verified'))) {
      return 'DOMAIN_VERIFICATION';
    }

    // Authentication errors
    if (code === 'eauth' || message.includes('authentication') || message.includes('credentials')) {
      return 'AUTHENTICATION';
    }

    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many') || code === 'erate') {
      return 'RATE_LIMIT';
    }

    // Network/connection errors
    if (code === 'enotfound' || code === 'econnrefused' || code === 'etimedout' || message.includes('connection')) {
      return 'NETWORK';
    }

    // Circuit breaker errors (custom)
    if (message.includes('circuit') || message.includes('breaker')) {
      return 'CIRCUIT_BREAKER';
    }

    // SMTP-specific errors
    if (code.startsWith('e') && code.length === 5) {
      return 'SMTP_ERROR';
    }

    // Default unknown error
    return 'UNKNOWN';
  }
}