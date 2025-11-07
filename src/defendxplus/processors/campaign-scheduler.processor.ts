import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { LaunchCampaignDto } from '../dto/phishing-campaign.dto';

/**
 * Campaign Scheduler Processor
 * Stages campaigns 60s before scheduled run time by moving them to the runner queue
 */
@Processor('campaign-scheduler')
export class CampaignSchedulerProcessor {
  private readonly logger = new Logger(CampaignSchedulerProcessor.name);
  private readonly STAGE_BUFFER_MS = 60_000; // 60 seconds

  constructor(
    @InjectQueue('campaign-runner')
    private readonly runnerQueue: Queue,
    @InjectQueue('campaign-scheduler')
    private readonly schedulerQueue: Queue
  ) {}

  @Process('stage-campaign')
  async handleStageToRunner(
    job: Job<{
      organizationId: string;
      campaignId: string;
      scheduleId: string;
      runAtMs: number;
      launchDto: LaunchCampaignDto;
    }>
  ): Promise<void> {
    const { organizationId, campaignId, scheduleId, runAtMs, launchDto } = job.data;
    const now = Date.now();
    const msUntilRun = runAtMs - now;

    this.logger.log(
      `[STAGE_PROCESSOR_START] Processing stage job: scheduleId=${scheduleId}, campaign=${campaignId}, msUntilRun=${msUntilRun}ms`
    );

    this.logger.debug(
      `[STAGE_PROCESSOR_TIME] now=${now}ms, runAtMs=${runAtMs}ms, msUntilRun=${msUntilRun}ms (${Math.ceil(msUntilRun / 1000)}s)`
    );

    // Check if we're ready to move to runner
    if (msUntilRun <= this.STAGE_BUFFER_MS && msUntilRun > -5_000) {
      this.logger.log(
        `[STAGE_TO_RUNNER] Moving to runner queue: scheduleId=${scheduleId}, delayMs=${msUntilRun}ms`
      );

      try {
        // Ready to run - move to runner queue
        await this.runnerQueue.add(
          'run-campaign',
          {
            organizationId,
            campaignId,
            scheduleId,
            runAtMs,
            launchDto,
          },
          {
            jobId: scheduleId,
            delay: Math.max(msUntilRun, 0),
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );

        this.logger.log(
          `[STAGE_TO_RUNNER_SUCCESS] Moved to runner: scheduleId=${scheduleId}, runIn=${Math.ceil(msUntilRun / 1000)}s`
        );
        return;
      } catch (error) {
        this.logger.error(
          `[STAGE_TO_RUNNER_ERROR] Failed to move to runner: ${error.message}`,
          error.stack
        );
        throw error;
      }
    }

    // If we woke up early (drift), re-stage with adjusted delay
    if (msUntilRun > this.STAGE_BUFFER_MS) {
      this.logger.warn(
        `[STAGE_CLOCK_DRIFT] Detected clock drift: msUntilRun=${msUntilRun}ms > stageBuffer=${this.STAGE_BUFFER_MS}ms. Re-staging.`
      );

      try {
        const newDelayMs = msUntilRun - this.STAGE_BUFFER_MS;

        await this.schedulerQueue.add(
          'stage-campaign',
          {
            organizationId,
            campaignId,
            scheduleId,
            runAtMs,
            launchDto,
          },
          {
            jobId: `stage:${scheduleId}`,
            delay: newDelayMs,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );

        this.logger.log(
          `[STAGE_RESTAGE_SUCCESS] Re-staged with new delay: scheduleId=${scheduleId}, newDelayMs=${newDelayMs}ms`
        );

        return;
      } catch (error) {
        this.logger.error(
          `[STAGE_RESTAGE_ERROR] Failed to re-stage: ${error.message}`,
          error.stack
        );
        throw error;
      }
    }

    // Too far in the past - likely a stale job after restart
    if (msUntilRun <= -5_000) {
      this.logger.warn(
        `[STAGE_TOO_LATE] Schedule is too far in the past: scheduleId=${scheduleId}, msUntilRun=${msUntilRun}ms`
      );

      // Clean up Redis metadata
      const client = (this.schedulerQueue as any).client;
      await client.zrem('campaign:schedules', scheduleId);
      await client.del(`campaign:schedule:${scheduleId}`);

      this.logger.log(`[STAGE_CLEANUP] Cleaned up stale schedule: ${scheduleId}`);

      throw new Error(
        `Schedule ${scheduleId} is too far in the past and was discarded`
      );
    }
  }
}
