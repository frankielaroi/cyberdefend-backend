import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { PhishingCampaignService } from '../services/phishing-campaign.service';
import { LaunchCampaignDto } from '../dto/phishing-campaign.dto';

/**
 * Campaign Runner Processor
 * Executes phishing campaigns at their scheduled time
 */
@Processor('campaign-runner')
export class CampaignRunnerProcessor {
  private readonly logger = new Logger(CampaignRunnerProcessor.name);

  constructor(
    private readonly campaignService: PhishingCampaignService,
    @InjectQueue('campaign-runner')
    private readonly runnerQueue: Queue
  ) {}

  @Process('run-campaign')
  async handleRunCampaign(
    job: Job<{
      organizationId: string;
      campaignId: string;
      scheduleId: string;
      runAtMs: number;
      launchDto: LaunchCampaignDto;
    }>
  ): Promise<{ success: boolean; campaignId: string; scheduleId: string }> {
    const { organizationId, campaignId, scheduleId, runAtMs, launchDto } = job.data;
    const actualRunTime = Date.now();
    const timingDiffMs = actualRunTime - runAtMs;

    this.logger.log(
      `[RUN_PROCESSOR_START] ⚡ CAMPAIGN EXECUTION TRIGGERED: scheduleId=${scheduleId}, campaign=${campaignId}, org=${organizationId}`
    );

    this.logger.log(
      `[RUN_PROCESSOR_TIMING] scheduled=${new Date(runAtMs).toISOString()}, actual=${new Date(actualRunTime).toISOString()}, diff=${timingDiffMs}ms (${Math.abs(Math.ceil(timingDiffMs / 1000))}s ${timingDiffMs > 0 ? 'LATE' : 'EARLY'})`
    );

    this.logger.log(`[RUN_PROCESSOR_LAUNCH_DTO] launchType=${launchDto?.launchType}, scheduledAt=${launchDto?.scheduledAt}`);
    this.logger.log(`[RUN_PROCESSOR_JOB_DATA] Job attempt #${job.attemptsMade + 1}/3`);

    try {
      this.logger.debug(`[RUN_PROCESSOR_INVOKE] Calling campaignService.launchCampaign()`);

      // Launch the campaign using the DTO
      const result = await this.campaignService.launchCampaign(
        organizationId,
        campaignId,
        launchDto
      );

      this.logger.log(
        `[RUN_PROCESSOR_SUCCESS] ✅ Campaign LAUNCHED SUCCESSFULLY: scheduleId=${scheduleId}, campaign=${campaignId}`
      );

      this.logger.debug(
        `[RUN_PROCESSOR_RESULT] Launch result: ${JSON.stringify(result)}`
      );

      // Clean up Redis metadata
      this.logger.debug(`[RUN_PROCESSOR_CLEANUP_START] Cleaning Redis metadata for ${scheduleId}`);

      try {
        await this.cleanScheduleMetadata(scheduleId);
        this.logger.debug(`[RUN_PROCESSOR_CLEANUP_SUCCESS] Cleaned up schedule metadata`);
      } catch (cleanupError) {
        this.logger.warn(
          `[RUN_PROCESSOR_CLEANUP_WARN] Non-critical cleanup error: ${cleanupError.message}`
        );
        // Don't re-throw - cleanup failure shouldn't fail the job
      }

      return {
        success: true,
        campaignId,
        scheduleId,
      };
    } catch (error) {
      this.logger.error(
        `[RUN_PROCESSOR_ERROR] Failed to launch campaign: scheduleId=${scheduleId}, campaign=${campaignId}, error=${error.message}`,
        error.stack
      );

      this.logger.warn(
        `[RUN_PROCESSOR_RETRY] Job will be retried. Attempts remaining: ${3 - (job.attemptsMade || 0)}`
      );

      // Keep schedule metadata for admin visibility/retry
      // Failed job will be retried up to 3 times by Bull's default config

      throw error; // Re-throw to trigger retry logic
    }
  }

  private async cleanScheduleMetadata(scheduleId: string): Promise<void> {
    try {
      const client = (this.runnerQueue as any).client;

      this.logger.debug(`[CLEANUP_ZREM] Removing from ZSET campaign:schedules: ${scheduleId}`);
      // Remove from sorted set
      await client.zrem('campaign:schedules', scheduleId);

      this.logger.debug(`[CLEANUP_DEL] Deleting HASH campaign:schedule:${scheduleId}`);
      // Delete hash metadata
      await client.del(`campaign:schedule:${scheduleId}`);

      this.logger.debug(`[CLEANUP_SUCCESS] Cleaned schedule metadata: ${scheduleId}`);
    } catch (error) {
      this.logger.error(
        `[CLEANUP_ERROR] Failed to clean schedule metadata: ${error.message}`,
        error.stack
      );
      // Don't re-throw - we don't want cleanup failures to fail the job
    }
  }
}
