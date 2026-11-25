import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, OnQueueProgress } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PhishingCampaignService } from '../services/phishing-campaign.service';

/**
 * Job data interfaces
 */
export interface PhishingEmailJob {
  campaignId: string;
  targetId: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface ProcessCampaignJob {
  campaignId: string;
  organizationId: string;
}

export interface RetryFailedJobsJob {
  campaignId: string;
  jobIds: string[];
}

/**
 * Bull Queue Processor for Phishing Email Operations
 * 
 * Handles asynchronous processing of phishing emails with:
 * - Automatic retries with exponential backoff
 * - Job prioritization
 * - Progress tracking
 * - Error handling and logging
 */
@Processor('phishing-email-queue')
export class PhishingEmailProcessor {
  private readonly logger = new Logger(PhishingEmailProcessor.name);

  constructor(
    private phishingCampaignService: PhishingCampaignService
  ) {}

  /**
   * Process a single phishing email job
   * This is called for each individual email to be sent
   */
  @Process('send-phishing-email')
  async handleSendPhishingEmail(job: Job<PhishingEmailJob>) {
    this.logger.log(
      `Processing phishing email job ${job.id} for campaign ${job.data.campaignId}, target ${job.data.targetId}`
    );
    
    try {
      // Process the single email through the campaign service
      await this.phishingCampaignService.processSingleEmailJob(
        job.data.campaignId,
        job.data.targetId
      );

      this.logger.log(`Successfully sent phishing email for job ${job.id}`);
      
      return {
        success: true,
        campaignId: job.data.campaignId,
        targetId: job.data.targetId,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(
        `Failed to send phishing email for job ${job.id}: ${error.message}`,
        error.stack
      );
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  /**
   * Process all emails for a campaign
   * This is called when a campaign is launched
   */
  @Process('process-campaign-emails')
  async handleProcessCampaignEmails(job: Job<ProcessCampaignJob>) {
    this.logger.log(`Processing all emails for campaign ${job.data.campaignId}`);
    
    try {
      // Update job progress
      await job.progress(10);

      // Process all emails for the campaign
      await this.phishingCampaignService.processEmailJobs(job.data.campaignId);

      await job.progress(100);
      
      this.logger.log(`Successfully processed all emails for campaign ${job.data.campaignId}`);
      
      return {
        success: true,
        campaignId: job.data.campaignId,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(
        `Failed to process campaign emails for job ${job.id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Retry failed email jobs
   * This is called by the cron job to retry failed emails
   */
  @Process('retry-failed-jobs')
  async handleRetryFailedJobs(job: Job<RetryFailedJobsJob>) {
    this.logger.log(
      `Retrying ${job.data.jobIds.length} failed jobs for campaign ${job.data.campaignId}`
    );
    
    try {
      // This will be handled by the campaign service
      // which will reset the jobs to PENDING and they'll be processed normally
      await this.phishingCampaignService.processEmailJobs(job.data.campaignId);
      
      this.logger.log(
        `Successfully retried failed jobs for campaign ${job.data.campaignId}`
      );
      
      return {
        success: true,
        campaignId: job.data.campaignId,
        retriedCount: job.data.jobIds.length,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(
        `Failed to retry jobs for campaign ${job.data.campaignId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Process scheduled campaigns
   * This is called by the cron job to launch scheduled campaigns
   */
  @Process('process-scheduled-campaigns')
  async handleProcessScheduledCampaigns(_job: Job<{ scheduledAt: Date }>) {
    this.logger.log('Processing scheduled campaigns...');
    
    try {
      // Call the cron job method directly
      await this.phishingCampaignService.processScheduledCampaigns();
      
      return {
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to process scheduled campaigns: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lifecycle hook: Called when job becomes active
   */
  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(
      `Job ${job.id} (${job.name}) is now active. Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 1}`
    );
  }

  /**
   * Lifecycle hook: Called when job completes successfully
   */
  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(
      `✅ Job ${job.id} (${job.name}) completed successfully. Result: ${JSON.stringify(result)}`
    );
  }

  /**
   * Lifecycle hook: Called when job fails
   */
  @OnQueueFailed()
  onError(job: Job, error: any) {
    this.logger.error(
      `❌ Job ${job.id} (${job.name}) failed. Attempt ${job.attemptsMade}/${job.opts.attempts || 1}. Error: ${error.message}`,
      error.stack
    );

    // Log additional context for debugging
    this.logger.error('Job data:', JSON.stringify(job.data));
    
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
      this.logger.error(
        `🚨 Job ${job.id} has exhausted all retry attempts and will not be retried automatically`
      );
    }
  }

  /**
   * Lifecycle hook: Called when job progress is updated
   */
  @OnQueueProgress()
  onProgress(job: Job, progress: number) {
    this.logger.log(`Job ${job.id} (${job.name}) is ${progress}% complete`);
  }
}
