import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LaunchCampaignDto, LaunchType } from '../dto/phishing-campaign.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Campaign Scheduler Service
 * Manages scheduling of phishing campaigns with Redis persistence.
 * Two-stage flow: stage-campaign (60s before) -> run-campaign (at scheduled time)
 */
@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);
  private readonly STAGE_BUFFER_MS = 60_000; // Stage 60s before run time
  private readonly PAST_GRACE_MS = 5_000; // Allow 5s grace for times just passed

  constructor(
    @InjectQueue('campaign-scheduler')
    private readonly schedulerQueue: Queue,
    @InjectQueue('campaign-runner')
    private readonly runnerQueue: Queue
  ) {}

  /**
   * Schedule a campaign to run at a future time
   * Returns metadata about where the job is queued
   */
  async scheduleCampaign(
    organizationId: string,
    campaignId: string,
    dto: LaunchCampaignDto
  ): Promise<{
    scheduleId: string;
    staged: boolean;
    queuedForRun: boolean;
    runAt: string;
    delaySeconds: number;
  }> {
    this.logger.debug(
      `[SCHEDULE_REQUEST] Received: org=${organizationId}, campaign=${campaignId}, launchType=${dto.launchType}`
    );

    // Ensure this is a SCHEDULED launch
    if (dto.launchType !== LaunchType.SCHEDULED) {
      this.logger.warn(
        `[SCHEDULE_VALIDATION_FAIL] Invalid launchType: expected SCHEDULED, got ${dto.launchType}`
      );
      throw new BadRequestException('launchType must be SCHEDULED for this endpoint');
    }

    if (!dto.scheduledAt) {
      this.logger.warn(
        `[SCHEDULE_VALIDATION_FAIL] Missing scheduledAt field for org=${organizationId}`
      );
      throw new BadRequestException('scheduledAt is required when launchType is SCHEDULED');
    }

    this.logger.debug(`[SCHEDULE_PARSE_TIME] Parsing scheduledAt: ${dto.scheduledAt}`);

    // Validate and parse scheduledAt
    const runAtMs = Date.parse(dto.scheduledAt);
    if (Number.isNaN(runAtMs)) {
      this.logger.warn(
        `[SCHEDULE_VALIDATION_FAIL] Invalid ISO8601 datetime: ${dto.scheduledAt}`
      );
      throw new BadRequestException('Invalid scheduledAt datetime. Must be ISO 8601 format.');
    }

    const now = Date.now();
    const delayMs = runAtMs - now;
    const delaySeconds = Math.ceil(delayMs / 1000);

    this.logger.log(
      `[SCHEDULE_TIME_CALC] now=${now}ms, runAtMs=${runAtMs}ms, delayMs=${delayMs}ms (${delaySeconds}s)`
    );

    // Reject times in the past (beyond grace period)
    if (delayMs < -this.PAST_GRACE_MS) {
      this.logger.warn(
        `[SCHEDULE_PAST_REJECT] Time too far in past: delayMs=${delayMs}, gracePeriod=${this.PAST_GRACE_MS}`
      );
      throw new BadRequestException(
        `scheduledAt must be in the future. Provided time is ${Math.abs(Math.ceil(delayMs / 1000))}s in the past.`
      );
    }

    // Generate unique schedule ID
    const scheduleId = `sch:${campaignId}:${runAtMs}:${uuidv4().slice(0, 8)}`;
    this.logger.log(`[SCHEDULE_ID_GENERATED] scheduleId=${scheduleId}`);

    // Persist schedule metadata in Redis
    try {
      this.logger.debug(`[REDIS_PERSIST_START] Saving metadata for ${scheduleId}`);
      await this.persistScheduleMetadata(
        organizationId,
        campaignId,
        scheduleId,
        runAtMs
      );
      this.logger.debug(`[REDIS_PERSIST_SUCCESS] Metadata persisted for ${scheduleId}`);
    } catch (error) {
      this.logger.error(
        `[REDIS_PERSIST_ERROR] Failed for ${scheduleId}: ${error.message}`,
        error.stack
      );
      throw error;
    }

    // Decide where to queue based on remaining time
    const staged = delayMs > this.STAGE_BUFFER_MS;
    this.logger.log(
      `[QUEUE_DECISION] staged=${staged}, delayMs=${delayMs}, stageBuffer=${this.STAGE_BUFFER_MS}ms`
    );

    if (staged) {
      // Queue for staging (will move to runner queue 60s before run time)
      const stagingDelayMs = Math.max(delayMs - this.STAGE_BUFFER_MS, 0);
      const stagingDelaySecs = Math.ceil(stagingDelayMs / 1000);

      this.logger.debug(
        `[QUEUE_STAGE_ADD_START] Adding to scheduler queue: stagingDelayMs=${stagingDelayMs}ms (${stagingDelaySecs}s)`
      );

      try {
        await this.schedulerQueue.add(
          'stage-campaign',
          {
            organizationId,
            campaignId,
            scheduleId,
            runAtMs,
            launchDto: dto,
          },
          {
            jobId: `stage:${scheduleId}`,
            delay: stagingDelayMs,
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
          `[QUEUE_STAGE_SUCCESS] Added to scheduler queue: campaignId=${campaignId}, scheduleId=${scheduleId}, stagingIn=${stagingDelaySecs}s`
        );
      } catch (error) {
        this.logger.error(
          `[QUEUE_STAGE_ERROR] Failed to add to scheduler: ${error.message}`,
          error.stack
        );
        throw error;
      }
    } else {
      // Queue directly for running (< 60s away)
      this.logger.debug(
        `[QUEUE_RUNNER_ADD_START] Adding directly to runner queue: delayMs=${delayMs}ms (${delaySeconds}s)`
      );

      try {
        await this.runnerQueue.add(
          'run-campaign',
          {
            organizationId,
            campaignId,
            scheduleId,
            runAtMs,
            launchDto: dto,
          },
          {
            jobId: scheduleId,
            delay: Math.max(delayMs, 0),
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
          `[QUEUE_RUNNER_SUCCESS] Added directly to runner queue: campaignId=${campaignId}, scheduleId=${scheduleId}, runIn=${delaySeconds}s`
        );
      } catch (error) {
        this.logger.error(
          `[QUEUE_RUNNER_ERROR] Failed to add to runner: ${error.message}`,
          error.stack
        );
        throw error;
      }
    }

    const result = {
      scheduleId,
      staged,
      queuedForRun: !staged,
      runAt: new Date(runAtMs).toISOString(),
      delaySeconds,
    };

    this.logger.log(
      `[SCHEDULE_COMPLETE] scheduleId=${scheduleId}, staged=${staged}, runAt=${result.runAt}, delaySeconds=${delaySeconds}`
    );

    return result;
  }

  /**
   * Cancel a scheduled campaign
   */
  async cancelSchedule(scheduleId: string): Promise<void> {
    this.logger.log(`[CANCEL_START] Cancelling schedule: ${scheduleId}`);

    try {
      // Try to remove from both queues
      const stageJobId = `stage:${scheduleId}`;

      this.logger.debug(`[CANCEL_STAGE_JOB] Looking for staging job: ${stageJobId}`);
      const stageJob = await this.schedulerQueue.getJob(stageJobId);
      if (stageJob) {
        await stageJob.remove();
        this.logger.log(`[CANCEL_STAGE_SUCCESS] Removed staging job: ${stageJobId}`);
      } else {
        this.logger.debug(`[CANCEL_STAGE_NOT_FOUND] No staging job found: ${stageJobId}`);
      }

      this.logger.debug(`[CANCEL_RUNNER_JOB] Looking for runner job: ${scheduleId}`);
      const runJob = await this.runnerQueue.getJob(scheduleId);
      if (runJob) {
        await runJob.remove();
        this.logger.log(`[CANCEL_RUNNER_SUCCESS] Removed runner job: ${scheduleId}`);
      } else {
        this.logger.debug(`[CANCEL_RUNNER_NOT_FOUND] No runner job found: ${scheduleId}`);
      }

      // Clean Redis metadata
      this.logger.debug(`[CANCEL_REDIS_CLEANUP] Cleaning Redis metadata for ${scheduleId}`);
      await this.cleanScheduleMetadata(scheduleId);

      this.logger.log(`[CANCEL_SUCCESS] Cancelled schedule: ${scheduleId}`);
    } catch (error) {
      this.logger.error(
        `[CANCEL_ERROR] Failed to cancel schedule ${scheduleId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get upcoming schedules from Redis
   */
  async getUpcomingSchedules(
    organizationId: string,
    limit = 100
  ): Promise<Array<{
    scheduleId: string;
    campaignId: string;
    runAt: string;
    createdAt: string;
  }>> {
    this.logger.debug(`[GET_SCHEDULES_START] org=${organizationId}, limit=${limit}`);

    try {
      const client = (this.schedulerQueue as any).client;
      const now = Date.now();

      this.logger.debug(
        `[GET_SCHEDULES_QUERY] Querying ZSET for schedules from now(${now}) onwards`
      );

      // Get all schedules from ZSET that are in the future
      const scheduleIds = await client.zrangebyscore(
        'campaign:schedules',
        now,
        '+inf',
        'LIMIT',
        0,
        limit
      );

      this.logger.log(`[GET_SCHEDULES_FOUND] Found ${scheduleIds.length} upcoming schedules`);

      const schedules = [];
      for (const scheduleId of scheduleIds) {
        this.logger.debug(`[GET_SCHEDULES_FETCH] Fetching metadata for ${scheduleId}`);

        const metadata = await client.hgetall(
          `campaign:schedule:${scheduleId}`
        );
        if (metadata && metadata.campaignId) {
          if (metadata.organizationId !== organizationId) {
            this.logger.debug(
              `[GET_SCHEDULES_SKIP] Skipping ${scheduleId} - different org`
            );
            continue;
          }

          const schedule = {
            scheduleId,
            campaignId: metadata.campaignId,
            runAt: new Date(Number(metadata.runAt)).toISOString(),
            createdAt: new Date(Number(metadata.createdAt)).toISOString(),
          };

          this.logger.debug(
            `[GET_SCHEDULES_ADD] Adding schedule: ${scheduleId}, campaign=${metadata.campaignId}, runAt=${schedule.runAt}`
          );

          schedules.push(schedule);
        }
      }

      const sorted = schedules.sort(
        (a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime()
      );

      this.logger.log(
        `[GET_SCHEDULES_SUCCESS] Returned ${sorted.length} schedules for org=${organizationId}`
      );

      return sorted;
    } catch (error) {
      this.logger.error(
        `[GET_SCHEDULES_ERROR] Failed to get upcoming schedules: ${error.message}`,
        error.stack
      );
      return [];
    }
  }

  /**
   * Recover schedules from Redis on service startup
   */
  async recoverSchedulesOnStartup(): Promise<void> {
    this.logger.log(`[RECOVERY_START] Starting schedule recovery from Redis`);

    try {
      const client = (this.schedulerQueue as any).client;
      const now = Date.now();
      const gracePeriodMs = 5 * 60_000; // 5 minutes grace

      this.logger.debug(
        `[RECOVERY_QUERY] Querying schedules from ${now - gracePeriodMs}ms to now and beyond`
      );

      // Get schedules within recovery window
      const scheduleIds = await client.zrangebyscore(
        'campaign:schedules',
        now - gracePeriodMs,
        '+inf'
      );

      this.logger.log(`[RECOVERY_FOUND] Found ${scheduleIds.length} schedules to recover`);

      let recovered = 0;
      let skipped = 0;
      let cleaned = 0;

      for (const scheduleId of scheduleIds) {
        this.logger.debug(`[RECOVERY_PROCESS] Processing schedule: ${scheduleId}`);

        const metadata = await client.hgetall(
          `campaign:schedule:${scheduleId}`
        );
        if (!metadata || !metadata.campaignId) {
          this.logger.warn(`[RECOVERY_INVALID] Schedule has no valid metadata: ${scheduleId}`);
          continue;
        }

        const { organizationId, campaignId, runAt } = metadata;
        const runAtMs = Number(runAt);
        const delayMs = runAtMs - now;

        this.logger.debug(
          `[RECOVERY_METADATA] org=${organizationId}, campaign=${campaignId}, runAtMs=${runAtMs}, delayMs=${delayMs}ms`
        );

        // Skip if already processed or very far in future
        const existingStageJob = await this.schedulerQueue.getJob(
          `stage:${scheduleId}`
        );
        const existingRunJob = await this.runnerQueue.getJob(scheduleId);

        if (existingStageJob || existingRunJob) {
          this.logger.debug(
            `[RECOVERY_SKIP_EXISTING] Job already queued: stage=${!!existingStageJob}, run=${!!existingRunJob}`
          );
          skipped++;
          continue;
        }

        if (delayMs <= -this.PAST_GRACE_MS) {
          // Too old, clean up
          this.logger.warn(
            `[RECOVERY_CLEANUP_OLD] Schedule too old (${Math.abs(delayMs)}ms past): ${scheduleId}`
          );
          await this.cleanScheduleMetadata(scheduleId);
          cleaned++;
          continue;
        }

        // Re-queue based on remaining time
        if (delayMs > this.STAGE_BUFFER_MS) {
          this.logger.log(
            `[RECOVERY_REQUEUE_STAGE] Re-queuing to scheduler: ${scheduleId}, delayMs=${delayMs - this.STAGE_BUFFER_MS}ms`
          );

          await this.schedulerQueue.add(
            'stage-campaign',
            {
              organizationId,
              campaignId,
              scheduleId,
              runAtMs,
            },
            {
              jobId: `stage:${scheduleId}`,
              delay: Math.max(delayMs - this.STAGE_BUFFER_MS, 0),
              removeOnComplete: true,
              removeOnFail: false,
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
            }
          );
          recovered++;
        } else if (delayMs > -this.PAST_GRACE_MS) {
          this.logger.log(
            `[RECOVERY_REQUEUE_RUNNER] Re-queuing to runner: ${scheduleId}, delayMs=${delayMs}ms`
          );

          await this.runnerQueue.add(
            'run-campaign',
            {
              organizationId,
              campaignId,
              scheduleId,
              runAtMs,
            },
            {
              jobId: scheduleId,
              delay: Math.max(delayMs, 0),
              removeOnComplete: true,
              removeOnFail: false,
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
            }
          );
          recovered++;
        }
      }

      this.logger.log(
        `[RECOVERY_COMPLETE] Recovered=${recovered}, Skipped=${skipped}, Cleaned=${cleaned}, Total=${scheduleIds.length}`
      );
    } catch (error) {
      this.logger.error(
        `[RECOVERY_ERROR] Failed to recover schedules: ${error.message}`,
        error.stack
      );
    }
  }

  // ==================== Private Helpers ====================

  private async persistScheduleMetadata(
    organizationId: string,
    campaignId: string,
    scheduleId: string,
    runAtMs: number
  ): Promise<void> {
    const client = (this.schedulerQueue as any).client;
    const now = Date.now();

    this.logger.debug(
      `[PERSIST_ZADD] Adding to ZSET campaign:schedules: score=${runAtMs}, member=${scheduleId}`
    );

    // Add to sorted set (score = runAtMs for easy time-based queries)
    await client.zadd('campaign:schedules', runAtMs, scheduleId);

    this.logger.debug(
      `[PERSIST_HSET] Adding to HASH campaign:schedule:${scheduleId}: orgId=${organizationId}, campaignId=${campaignId}`
    );

    // Store metadata as hash
    await client.hset(
      `campaign:schedule:${scheduleId}`,
      'organizationId',
      organizationId,
      'campaignId',
      campaignId,
      'runAt',
      String(runAtMs),
      'createdAt',
      String(now)
    );

    this.logger.debug(
      `[PERSIST_TTL] Setting TTL for campaign:schedule:${scheduleId} to 30 days`
    );

    // Set TTL: delete after 30 days
    await client.expire(`campaign:schedule:${scheduleId}`, 30 * 24 * 60 * 60);

    this.logger.debug(`[PERSIST_SUCCESS] All metadata persisted for ${scheduleId}`);
  }

  private async cleanScheduleMetadata(scheduleId: string): Promise<void> {
    const client = (this.schedulerQueue as any).client;

    this.logger.debug(`[CLEANUP_ZREM] Removing from ZSET campaign:schedules: ${scheduleId}`);
    await client.zrem('campaign:schedules', scheduleId);

    this.logger.debug(`[CLEANUP_DEL] Deleting HASH campaign:schedule:${scheduleId}`);
    await client.del(`campaign:schedule:${scheduleId}`);

    this.logger.debug(`[CLEANUP_SUCCESS] All metadata cleaned for ${scheduleId}`);
  }

  /**
   * Cron Job: Every 60 seconds, load schedules with ≤60s remaining to runner queue
   * This ensures no schedules are missed if they slip through the staging queue
   */
  @Cron('*/60 * * * * *') // Every 60 seconds
  async pollAndLoadReadySchedules(): Promise<void> {
    this.logger.log(`[CRON_POLL_START] Polling Redis for schedules ready to run (≤60s away)`);

    try {
      const client = (this.schedulerQueue as any).client;
      const now = Date.now();
      const cutoffTime = now + this.STAGE_BUFFER_MS; // 60 seconds from now

      this.logger.debug(
        `[CRON_TIME_WINDOW] now=${now}ms, cutoffTime=${cutoffTime}ms (60s window)`
      );

      // Get all schedules that should run within the next 60 seconds
      const scheduleIds = await client.zrangebyscore(
        'campaign:schedules',
        now,
        cutoffTime
      );

      this.logger.log(`[CRON_FOUND] Found ${scheduleIds.length} schedules ready to run`);

      if (scheduleIds.length === 0) {
        this.logger.debug(`[CRON_NONE] No schedules in 60-second window`);
        return;
      }

      let queued = 0;
      let skipped = 0;
      let failed = 0;

      for (const scheduleId of scheduleIds) {
        try {
          this.logger.debug(`[CRON_PROCESS] Processing schedule: ${scheduleId}`);

          // Get metadata
          const metadata = await client.hgetall(
            `campaign:schedule:${scheduleId}`
          );

          if (!metadata || !metadata.campaignId) {
            this.logger.warn(
              `[CRON_INVALID] Schedule has no valid metadata: ${scheduleId}`
            );
            skipped++;
            continue;
          }

          const { organizationId, campaignId, runAt } = metadata;
          const runAtMs = Number(runAt);
          const msUntilRun = runAtMs - now;

          this.logger.debug(
            `[CRON_METADATA] org=${organizationId}, campaign=${campaignId}, msUntilRun=${msUntilRun}ms`
          );

          // Check if already queued in runner queue
          const existingJob = await this.runnerQueue.getJob(scheduleId);
          if (existingJob) {
            this.logger.debug(
              `[CRON_ALREADY_QUEUED] Schedule already in runner queue: ${scheduleId}`
            );
            skipped++;
            continue;
          }

          // Check if already queued in staging queue
          const stagingJob = await this.schedulerQueue.getJob(
            `stage:${scheduleId}`
          );
          if (stagingJob) {
            this.logger.debug(
              `[CRON_IN_STAGING] Schedule still in staging queue: ${scheduleId}`
            );
            skipped++;
            continue;
          }

          // Queue to runner if not already queued
          this.logger.log(
            `[CRON_QUEUE_TO_RUNNER] Queueing to runner: ${scheduleId}, msUntilRun=${msUntilRun}ms`
          );

          await this.runnerQueue.add(
            'run-campaign',
            {
              organizationId,
              campaignId,
              scheduleId,
              runAtMs,
              launchDto: {
                launchType: LaunchType.SCHEDULED,
                scheduledAt: new Date(runAtMs).toISOString(),
                campaignId
              }
            },
            {
              jobId: scheduleId,
              delay: Math.max(msUntilRun, 0),
              removeOnComplete: true,
              removeOnFail: false,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000
              }
            }
          );

          this.logger.log(
            `[CRON_QUEUED_SUCCESS] Added to runner queue: ${scheduleId}`
          );
          queued++;
        } catch (error) {
          this.logger.error(
            `[CRON_QUEUE_ERROR] Failed to queue ${scheduleId}: ${error.message}`,
            error.stack
          );
          failed++;
        }
      }

      this.logger.log(
        `[CRON_POLL_COMPLETE] Polling complete: queued=${queued}, skipped=${skipped}, failed=${failed}, total=${scheduleIds.length}`
      );
    } catch (error) {
      this.logger.error(
        `[CRON_POLL_ERROR] Failed to poll schedules: ${error.message}`,
        error.stack
      );
    }
  }
}

