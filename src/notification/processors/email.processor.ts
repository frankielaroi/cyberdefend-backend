import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../services/email.service';
import { PrismaService } from '../../database/prisma.service';
import { EmailData, NotificationResult } from '../interfaces/notification.interface';

export interface EmailJobData {
  id: string;
  emailData: EmailData;
  retryOptions?: {
    attempts?: number;
    delay?: number;
    exponentialBackoff?: boolean;
  };
  metadata?: Record<string, any>;
}

@Processor('email-queue')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private emailService: EmailService,
    private prismaService: PrismaService,
  ) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>): Promise<NotificationResult> {
    const { id, emailData, metadata } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing email job ${job.id} for notification ${id}`);

    try {
      // Update notification status to processing
      await this.updateNotificationStatus(id, 'pending', job.attemptsMade + 1);

      // Send email
      const result = await this.emailService.sendEmail(emailData);
      const duration = Date.now() - startTime;

      if (result.success) {
        // Update notification status to sent
        await this.updateNotificationStatus(id, 'sent', job.attemptsMade + 1, {
          sentAt: new Date(),
          messageId: result.messageId,
        });

        this.logger.log(
          `Email job ${job.id} completed successfully in ${duration}ms. MessageId: ${result.messageId}`
        );

        // Update job progress
        await job.progress(100);

        return result;
      } else {
        throw new Error(result.error || 'Email sending failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(
        `Email job ${job.id} failed after ${duration}ms (attempt ${job.attemptsMade + 1}):`,
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

  @Process('send-bulk-email')
  async handleSendBulkEmail(job: Job<{ emails: EmailJobData[] }>): Promise<void> {
    const { emails } = job.data;
    const totalEmails = emails.length;
    
    this.logger.log(`Processing bulk email job ${job.id} with ${totalEmails} emails`);

    let processed = 0;
    const batchSize = 10;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (emailJob) => {
        try {
          const result = await this.emailService.sendEmail(emailJob.emailData);
          
          const status = result.success ? 'sent' : 'failed';
          await this.updateNotificationStatus(emailJob.id, status, 1, {
            sentAt: result.success ? new Date() : undefined,
            messageId: result.messageId,
            error: result.error,
          });

          return result;
        } catch (error) {
          await this.updateNotificationStatus(emailJob.id, 'failed', 1, {
            error: error.message,
            lastAttempt: new Date(),
          });
          
          this.logger.error(`Bulk email failed for notification ${emailJob.id}:`, error);
          return { success: false, error: error.message };
        }
      });

      await Promise.allSettled(batchPromises);
      processed += batch.length;

      // Update job progress
      const progress = Math.round((processed / totalEmails) * 100);
      await job.progress(progress);

      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.logger.log(`Bulk email job ${job.id} completed. Processed ${processed}/${totalEmails} emails`);
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