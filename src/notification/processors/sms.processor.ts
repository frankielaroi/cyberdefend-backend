import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SmsService } from '../services/sms.service';
import { PrismaService } from '../../database/prisma.service';
import { SmsData, NotificationResult } from '../interfaces/notification.interface';

export interface SmsJobData {
  id: string;
  smsData: SmsData;
  retryOptions?: {
    attempts?: number;
    delay?: number;
    exponentialBackoff?: boolean;
  };
  metadata?: Record<string, any>;
}

@Processor('sms-queue')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    private smsService: SmsService,
    private prismaService: PrismaService,
  ) {}

  @Process('send-sms')
  async handleSendSms(job: Job<SmsJobData>): Promise<NotificationResult> {
    const { id, smsData } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing SMS job ${job.id} for notification ${id}`);

    try {
      // Update notification status to processing
      await this.updateNotificationStatus(id, 'pending', job.attemptsMade + 1);

      // Send SMS
      const result = await this.smsService.sendSms(smsData);
      const duration = Date.now() - startTime;

      if (result.success) {
        // Update notification status to sent
        await this.updateNotificationStatus(id, 'sent', job.attemptsMade + 1, {
          sentAt: new Date(),
          messageId: result.messageId,
        });

        this.logger.log(
          `SMS job ${job.id} completed successfully in ${duration}ms. MessageId: ${result.messageId}`
        );

        // Update job progress
        await job.progress(100);

        return result;
      } else {
        throw new Error(result.error || 'SMS sending failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(
        `SMS job ${job.id} failed after ${duration}ms (attempt ${job.attemptsMade + 1}):`,
        error
      );

      // Check if this is the final attempt
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      // Update notification status
      const status = isFinalAttempt ? 'failed' : 'retry';
      await this.updateNotificationStatus(id, status, job.attemptsMade + 1, {
        error: error.message,
        lastAttempt: new Date(),
      });

      // Re-throw error to trigger Bull's retry mechanism
      throw error;
    }
  }

  @Process('send-bulk-sms')
  async handleSendBulkSms(job: Job<{ smsMessages: SmsJobData[] }>): Promise<void> {
    const { smsMessages } = job.data;
    const totalSms = smsMessages.length;
    
    this.logger.log(`Processing bulk SMS job ${job.id} with ${totalSms} messages`);

    let processed = 0;
    const batchSize = 5; // Smaller batch size for SMS to respect rate limits

    for (let i = 0; i < smsMessages.length; i += batchSize) {
      const batch = smsMessages.slice(i, i + batchSize);
      
      // Process batch sequentially to avoid rate limiting
      for (const smsJob of batch) {
        try {
          const result = await this.smsService.sendSms(smsJob.smsData);
          
          const status = result.success ? 'sent' : 'failed';
          await this.updateNotificationStatus(smsJob.id, status, 1, {
            sentAt: result.success ? new Date() : undefined,
            messageId: result.messageId,
            error: result.error,
          });

          processed++;
          
          // Update job progress
          const progress = Math.round((processed / totalSms) * 100);
          await job.progress(progress);

          // Small delay between SMS sends to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          await this.updateNotificationStatus(smsJob.id, 'failed', 1, {
            error: error.message,
            lastAttempt: new Date(),
          });
          
          this.logger.error(`Bulk SMS failed for notification ${smsJob.id}:`, error);
          processed++;
        }
      }

      // Delay between batches
      if (i + batchSize < smsMessages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.log(`Bulk SMS job ${job.id} completed. Processed ${processed}/${totalSms} messages`);
  }

  private async updateNotificationStatus(
    notificationId: string,
    status: 'pending' | 'sent' | 'failed' | 'retry',
    attempts: number,
    additionalData?: {
      sentAt?: Date;
      messageId?: string;
      error?: string;
      lastAttempt?: Date;
    }
  ): Promise<void> {
    try {
      // Map status to Prisma enum
      const prismaStatus = status.toUpperCase() as 'PENDING' | 'SENT' | 'FAILED' | 'RETRY';
      
      await this.prismaService.notificationHistory.update({
        where: { id: notificationId },
        data: {
          status: prismaStatus,
          attempts,
          updatedAt: new Date(),
          ...additionalData,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update notification ${notificationId} status:`, error);
    }
  }
}