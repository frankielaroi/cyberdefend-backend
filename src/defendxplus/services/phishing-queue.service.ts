import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PhishingEmailJob, ProcessCampaignJob, RetryFailedJobsJob } from '../processors/phishing-email.processor';

/**
 * Phishing Queue Service
 * Provides methods to add jobs to the Bull queue for async processing
 */
@Injectable()
export class PhishingQueueService {
  private readonly logger = new Logger(PhishingQueueService.name);

  constructor(
    @InjectQueue('phishing-email-queue')
    private phishingEmailQueue: Queue
  ) {}

  /**
   * Add a single email job to the queue
   */
  async addEmailJob(
    campaignId: string,
    targetId: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    try {
      const jobData: PhishingEmailJob = {
        campaignId,
        targetId,
        priority
      };

      const priorityValue = priority === 'high' ? 1 : priority === 'low' ? 3 : 2;

      await this.phishingEmailQueue.add('send-phishing-email', jobData, {
        priority: priorityValue,
        jobId: `email-${campaignId}-${targetId}`, // Unique job ID to prevent duplicates
      });

      this.logger.log(`Added email job to queue: campaign=${campaignId}, target=${targetId}, priority=${priority}`);
    } catch (error) {
      this.logger.error(`Failed to add email job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add multiple email jobs to the queue (bulk)
   */
  async addBulkEmailJobs(
    campaignId: string,
    targetIds: string[],
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    try {
      const priorityValue = priority === 'high' ? 1 : priority === 'low' ? 3 : 2;

      const jobs = targetIds.map(targetId => ({
        name: 'send-phishing-email',
        data: {
          campaignId,
          targetId,
          priority
        } as PhishingEmailJob,
        opts: {
          priority: priorityValue,
          jobId: `email-${campaignId}-${targetId}`,
        }
      }));

      await this.phishingEmailQueue.addBulk(jobs);

      this.logger.log(`Added ${jobs.length} email jobs to queue for campaign ${campaignId}`);
    } catch (error) {
      this.logger.error(`Failed to add bulk email jobs to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add campaign processing job to the queue
   */
  async addCampaignProcessingJob(
    campaignId: string,
    organizationId: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    try {
      const jobData: ProcessCampaignJob = {
        campaignId,
        organizationId
      };

      const priorityValue = priority === 'high' ? 1 : priority === 'low' ? 3 : 2;

      await this.phishingEmailQueue.add('process-campaign-emails', jobData, {
        priority: priorityValue,
        jobId: `campaign-${campaignId}`,
      });

      this.logger.log(`Added campaign processing job to queue: campaign=${campaignId}`);
    } catch (error) {
      this.logger.error(`Failed to add campaign processing job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add retry job to the queue
   */
  async addRetryJob(campaignId: string, jobIds: string[]): Promise<void> {
    try {
      const jobData: RetryFailedJobsJob = {
        campaignId,
        jobIds
      };

      await this.phishingEmailQueue.add('retry-failed-jobs', jobData, {
        priority: 2, // Normal priority
        jobId: `retry-${campaignId}-${Date.now()}`,
      });

      this.logger.log(`Added retry job to queue: campaign=${campaignId}, jobs=${jobIds.length}`);
    } catch (error) {
      this.logger.error(`Failed to add retry job to queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const [
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused
      ] = await Promise.all([
        this.phishingEmailQueue.getWaitingCount(),
        this.phishingEmailQueue.getActiveCount(),
        this.phishingEmailQueue.getCompletedCount(),
        this.phishingEmailQueue.getFailedCount(),
        this.phishingEmailQueue.getDelayedCount(),
        this.phishingEmailQueue.getPausedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        total: waiting + active + completed + failed + delayed + paused
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get failed jobs for a campaign
   */
  async getFailedJobsForCampaign(campaignId: string) {
    try {
      const failedJobs = await this.phishingEmailQueue.getFailed();
      
      return failedJobs.filter(job => 
        job.data.campaignId === campaignId
      );
    } catch (error) {
      this.logger.error(`Failed to get failed jobs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retry a specific failed job
   */
  async retryJob(jobId: string): Promise<void> {
    try {
      const job = await this.phishingEmailQueue.getJob(jobId);
      
      if (job) {
        await job.retry();
        this.logger.log(`Retrying job ${jobId}`);
      } else {
        this.logger.warn(`Job ${jobId} not found`);
      }
    } catch (error) {
      this.logger.error(`Failed to retry job ${jobId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Clean completed jobs older than X milliseconds
   */
  async cleanOldJobs(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      await this.phishingEmailQueue.clean(olderThan, 'completed');
      await this.phishingEmailQueue.clean(olderThan, 'failed');
      
      this.logger.log(`Cleaned jobs older than ${olderThan}ms`);
    } catch (error) {
      this.logger.error(`Failed to clean old jobs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Pause the queue (stop processing jobs)
   */
  async pauseQueue(): Promise<void> {
    try {
      await this.phishingEmailQueue.pause();
      this.logger.log('Queue paused');
    } catch (error) {
      this.logger.error(`Failed to pause queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Resume the queue (start processing jobs)
   */
  async resumeQueue(): Promise<void> {
    try {
      await this.phishingEmailQueue.resume();
      this.logger.log('Queue resumed');
    } catch (error) {
      this.logger.error(`Failed to resume queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(jobId: string): Promise<void> {
    try {
      const job = await this.phishingEmailQueue.getJob(jobId);
      
      if (job) {
        await job.remove();
        this.logger.log(`Removed job ${jobId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
