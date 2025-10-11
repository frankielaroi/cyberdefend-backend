import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PrismaService } from '../../database/prisma.service';
import {
  NotificationJob,
  NotificationResult,
  EmailData,
  SmsData,
  ScheduleOptions,
} from '../interfaces/notification.interface';
import {
  ScheduleEmailDto,
  ScheduleSmsDto,
  SendEmailDto,
  SendSmsDto,
} from '../dto/notification.dto';
import { EmailJobData } from '../processors/email.processor';
import { SmsJobData } from '../processors/sms.processor';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue('email-queue') private emailQueue: Queue,
    @InjectQueue('sms-queue') private smsQueue: Queue,
    private emailService: EmailService,
    private smsService: SmsService,
    private prismaService: PrismaService,
  ) {}

  // Immediate email sending
  async sendEmail(sendEmailDto: SendEmailDto): Promise<NotificationResult> {
    this.logger.log(`Sending immediate email to ${sendEmailDto.to}`);
    
    const emailData: EmailData = {
      to: sendEmailDto.to,
      subject: sendEmailDto.subject,
      htmlContent: sendEmailDto.htmlContent,
      textContent: sendEmailDto.textContent,
      category: sendEmailDto.category,
      fromEmail: sendEmailDto.fromEmail,
      fromName: sendEmailDto.fromName,
      attachments: sendEmailDto.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    };

    return await this.emailService.sendEmail(emailData);
  }

  // Immediate SMS sending
  async sendSms(sendSmsDto: SendSmsDto): Promise<NotificationResult> {
    this.logger.log(`Sending immediate SMS to ${sendSmsDto.to}`);
    
    const smsData: SmsData = {
      to: sendSmsDto.to,
      message: sendSmsDto.message,
      from: sendSmsDto.from,
    };

    return await this.smsService.sendSms(smsData);
  }

  // Scheduled email sending
  async scheduleEmail(scheduleEmailDto: ScheduleEmailDto): Promise<{ jobId: string; notificationId: string }> {
    const notificationId = uuidv4();
    
    this.logger.log(`Scheduling email notification ${notificationId} to ${scheduleEmailDto.to}`);

    // Create notification history record
    await this.createNotificationHistory(
      notificationId,
      'email',
      Array.isArray(scheduleEmailDto.to) ? scheduleEmailDto.to.join(', ') : scheduleEmailDto.to,
      scheduleEmailDto.subject,
      scheduleEmailDto.htmlContent || scheduleEmailDto.textContent || '',
      scheduleEmailDto.metadata,
    );

    // Prepare email data
    const emailData: EmailData = {
      to: scheduleEmailDto.to,
      subject: scheduleEmailDto.subject,
      htmlContent: scheduleEmailDto.htmlContent,
      textContent: scheduleEmailDto.textContent,
      category: scheduleEmailDto.category,
      fromEmail: scheduleEmailDto.fromEmail,
      fromName: scheduleEmailDto.fromName,
      attachments: scheduleEmailDto.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    };

    // Prepare job data
    const jobData: EmailJobData = {
      id: notificationId,
      emailData,
      retryOptions: scheduleEmailDto.retryOptions,
      metadata: scheduleEmailDto.metadata,
    };

    // Prepare job options
    const jobOptions = this.prepareJobOptions(
      this.transformScheduleOptions(scheduleEmailDto.schedule), 
      scheduleEmailDto.retryOptions, 
      scheduleEmailDto.priority
    );

    // Add job to queue
    const job = await this.emailQueue.add('send-email', jobData, jobOptions);

    this.logger.log(`Email job ${job.id} scheduled for notification ${notificationId}`);

    return {
      jobId: job.id.toString(),
      notificationId,
    };
  }

  // Scheduled SMS sending
  async scheduleSms(scheduleSmsDto: ScheduleSmsDto): Promise<{ jobId: string; notificationId: string }> {
    const notificationId = uuidv4();
    
    this.logger.log(`Scheduling SMS notification ${notificationId} to ${scheduleSmsDto.to}`);

    // Create notification history record
    await this.createNotificationHistory(
      notificationId,
      'sms',
      Array.isArray(scheduleSmsDto.to) ? scheduleSmsDto.to.join(', ') : scheduleSmsDto.to,
      undefined,
      scheduleSmsDto.message,
      scheduleSmsDto.metadata,
    );

    // Prepare SMS data
    const smsData: SmsData = {
      to: scheduleSmsDto.to,
      message: scheduleSmsDto.message,
      from: scheduleSmsDto.from,
    };

    // Prepare job data
    const jobData: SmsJobData = {
      id: notificationId,
      smsData,
      retryOptions: scheduleSmsDto.retryOptions,
      metadata: scheduleSmsDto.metadata,
    };

    // Prepare job options
    const jobOptions = this.prepareJobOptions(
      this.transformScheduleOptions(scheduleSmsDto.schedule), 
      scheduleSmsDto.retryOptions, 
      scheduleSmsDto.priority
    );

    // Add job to queue
    const job = await this.smsQueue.add('send-sms', jobData, jobOptions);

    this.logger.log(`SMS job ${job.id} scheduled for notification ${notificationId}`);

    return {
      jobId: job.id.toString(),
      notificationId,
    };
  }

  // Bulk email scheduling
  async scheduleBulkEmails(emails: ScheduleEmailDto[]): Promise<{ jobId: string; notificationIds: string[] }> {
    this.logger.log(`Scheduling bulk email with ${emails.length} emails`);

    const notificationIds: string[] = [];
    const emailJobs: EmailJobData[] = [];

    // Prepare all email jobs
    for (const emailDto of emails) {
      const notificationId = uuidv4();
      notificationIds.push(notificationId);

      // Create notification history record
      await this.createNotificationHistory(
        notificationId,
        'email',
        Array.isArray(emailDto.to) ? emailDto.to.join(', ') : emailDto.to,
        emailDto.subject,
        emailDto.htmlContent || emailDto.textContent || '',
        emailDto.metadata,
      );

      // Prepare email data
      const emailData: EmailData = {
        to: emailDto.to,
        subject: emailDto.subject,
        htmlContent: emailDto.htmlContent,
        textContent: emailDto.textContent,
        category: emailDto.category,
        fromEmail: emailDto.fromEmail,
        fromName: emailDto.fromName,
        attachments: emailDto.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      emailJobs.push({
        id: notificationId,
        emailData,
        retryOptions: emailDto.retryOptions,
        metadata: emailDto.metadata,
      });
    }

    // Add bulk job to queue
    const job = await this.emailQueue.add('send-bulk-email', { emails: emailJobs }, {
      priority: this.getPriorityValue('normal'),
      removeOnComplete: 10,
      removeOnFail: 10,
    });

    this.logger.log(`Bulk email job ${job.id} scheduled with ${notificationIds.length} notifications`);

    return {
      jobId: job.id.toString(),
      notificationIds,
    };
  }

  // Bulk SMS scheduling
  async scheduleBulkSms(smsMessages: ScheduleSmsDto[]): Promise<{ jobId: string; notificationIds: string[] }> {
    this.logger.log(`Scheduling bulk SMS with ${smsMessages.length} messages`);

    const notificationIds: string[] = [];
    const smsJobs: SmsJobData[] = [];

    // Prepare all SMS jobs
    for (const smsDto of smsMessages) {
      const notificationId = uuidv4();
      notificationIds.push(notificationId);

      // Create notification history record
      await this.createNotificationHistory(
        notificationId,
        'sms',
        Array.isArray(smsDto.to) ? smsDto.to.join(', ') : smsDto.to,
        undefined,
        smsDto.message,
        smsDto.metadata,
      );

      // Prepare SMS data
      const smsData: SmsData = {
        to: smsDto.to,
        message: smsDto.message,
        from: smsDto.from,
      };

      smsJobs.push({
        id: notificationId,
        smsData,
        retryOptions: smsDto.retryOptions,
        metadata: smsDto.metadata,
      });
    }

    // Add bulk job to queue
    const job = await this.smsQueue.add('send-bulk-sms', { smsMessages: smsJobs }, {
      priority: this.getPriorityValue('normal'),
      removeOnComplete: 10,
      removeOnFail: 10,
    });

    this.logger.log(`Bulk SMS job ${job.id} scheduled with ${notificationIds.length} notifications`);

    return {
      jobId: job.id.toString(),
      notificationIds,
    };
  }

  // Cancel scheduled notification
  async cancelNotification(jobId: string, type: 'email' | 'sms'): Promise<boolean> {
    try {
      const queue = type === 'email' ? this.emailQueue : this.smsQueue;
      const job = await queue.getJob(jobId);

      if (job) {
        await job.remove();
        this.logger.log(`Cancelled ${type} job ${jobId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to cancel ${type} job ${jobId}:`, error);
      return false;
    }
  }

  // Get notification status
  async getNotificationStatus(notificationId: string): Promise<any> {
    try {
      return await this.prismaService.notificationHistory.findUnique({
        where: { id: notificationId },
      });
    } catch (error) {
      this.logger.error(`Failed to get notification status for ${notificationId}:`, error);
      throw error;
    }
  }

  // Get job status
  async getJobStatus(jobId: string, type: 'email' | 'sms'): Promise<any> {
    try {
      const queue = type === 'email' ? this.emailQueue : this.smsQueue;
      const job = await queue.getJob(jobId);

      if (!job) {
        return null;
      }

      return {
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress(),
        returnvalue: job.returnvalue,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        opts: job.opts,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}:`, error);
      throw error;
    }
  }

  // Test services
  async testServices(): Promise<{ email: boolean; sms: boolean }> {
    const [emailStatus, smsStatus] = await Promise.all([
      this.emailService.testConnection(),
      this.smsService.testConnection(),
    ]);

    return {
      email: emailStatus,
      sms: smsStatus,
    };
  }

  private prepareJobOptions(
    schedule?: ScheduleOptions,
    retryOptions?: { attempts?: number; delay?: number; exponentialBackoff?: boolean },
    priority?: 'low' | 'normal' | 'high' | 'critical',
  ): JobOptions {
    const jobOptions: JobOptions = {
      priority: this.getPriorityValue(priority || 'normal'),
      removeOnComplete: 50,
      removeOnFail: 50,
    };

    // Handle delays and scheduling
    if (schedule?.delay) {
      jobOptions.delay = schedule.delay;
    }

    // Handle cron scheduling
    if (schedule?.cron) {
      jobOptions.repeat = { cron: schedule.cron };
    }

    // Handle repeat options
    if (schedule?.repeat) {
      jobOptions.repeat = {
        every: schedule.repeat.every,
        limit: schedule.repeat.limit,
        endDate: schedule.repeat.endDate,
      };
    }

    // Handle retry options
    if (retryOptions) {
      jobOptions.attempts = retryOptions.attempts || 3;
      
      if (retryOptions.exponentialBackoff) {
        jobOptions.backoff = {
          type: 'exponential',
          delay: retryOptions.delay || 5000,
        };
      } else {
        jobOptions.backoff = {
          type: 'fixed',
          delay: retryOptions.delay || 5000,
        };
      }
    }

    return jobOptions;
  }

  private transformScheduleOptions(scheduleDto?: any): ScheduleOptions | undefined {
    if (!scheduleDto) return undefined;

    const transformed: ScheduleOptions = {};

    if (scheduleDto.delay !== undefined) {
      transformed.delay = scheduleDto.delay;
    }

    if (scheduleDto.cron) {
      transformed.cron = scheduleDto.cron;
    }

    if (scheduleDto.repeat) {
      transformed.repeat = {
        every: scheduleDto.repeat.every,
        limit: scheduleDto.repeat.limit,
        endDate: scheduleDto.repeat.endDate ? new Date(scheduleDto.repeat.endDate) : undefined,
      };
    }

    return transformed;
  }

  private getPriorityValue(priority: 'low' | 'normal' | 'high' | 'critical'): number {
    const priorities = {
      low: 1,
      normal: 5,
      high: 10,
      critical: 15,
    };

    return priorities[priority] || priorities.normal;
  }

  private async createNotificationHistory(
    id: string,
    type: 'email' | 'sms',
    recipient: string,
    subject: string | undefined,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      // Map type to Prisma enum
      const prismaType = type.toUpperCase() as 'EMAIL' | 'SMS';
      
      await this.prismaService.notificationHistory.create({
        data: {
          id,
          type: prismaType,
          recipient,
          subject,
          content: JSON.stringify(content), // Store as JSON string
          status: 'PENDING',
          attempts: 0,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
      
      this.logger.debug(`Created notification history for ${id} (${type})`);
    } catch (error) {
      this.logger.error(`Failed to create notification history for ${id}:`, error);
    }
  }
}