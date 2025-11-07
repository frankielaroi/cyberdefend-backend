# Campaign Scheduling - Comprehensive Logging Guide

## Overview

The campaign scheduling system now includes comprehensive logging at all stages. All logs use structured tags like `[TAG]` for easy filtering and searching.

## Log Levels Used

- **`debug`**: Detailed technical information, Redis operations, time calculations
- **`log`**: Important state transitions, queue operations, scheduling decisions
- **`warn`**: Validation failures, clock drift, stale jobs
- **`error`**: Failures with stack traces, retry info

## Scheduling Request Flow

### 1. Schedule Request Received
```
[SCHEDULE_REQUEST] Received: org=..., campaign=..., launchType=...
```
- **Level**: DEBUG
- **Triggered**: When `/schedule` endpoint is called
- **Info**: Organization ID, campaign ID, launch type

### 2. Validation Phase
```
[SCHEDULE_VALIDATION_FAIL] Invalid launchType: expected SCHEDULED, got ...
[SCHEDULE_VALIDATION_FAIL] Missing scheduledAt field for org=...
[SCHEDULE_VALIDATION_FAIL] Invalid ISO8601 datetime: ...
```
- **Level**: WARN/DEBUG
- **Triggered**: If DTO validation fails
- **Info**: What validation failed and why

```
[SCHEDULE_PARSE_TIME] Parsing scheduledAt: 2025-11-07T14:30:00Z
```
- **Level**: DEBUG
- **Info**: The datetime being parsed

### 3. Time Calculation
```
[SCHEDULE_TIME_CALC] now=1730976000000ms, runAtMs=1730976600000ms, delayMs=600000ms (600s)
```
- **Level**: LOG
- **Info**: Current time, scheduled time, delay in ms and seconds

```
[SCHEDULE_PAST_REJECT] Time too far in past: delayMs=-6000, gracePeriod=5000
```
- **Level**: WARN
- **Triggered**: If scheduled time is > 5 seconds in the past
- **Info**: How far in the past and the grace period

### 4. Schedule ID Generation
```
[SCHEDULE_ID_GENERATED] scheduleId=sch:campaign_123:1730976600000:a1b2c3d4
```
- **Level**: LOG
- **Info**: Unique schedule identifier

### 5. Redis Persistence
```
[REDIS_PERSIST_START] Saving metadata for sch:...
[PERSIST_ZADD] Adding to ZSET campaign:schedules: score=1730976600000, member=sch:...
[PERSIST_HSET] Adding to HASH campaign:schedule:sch:...: orgId=org_123, campaignId=campaign_123
[PERSIST_TTL] Setting TTL for campaign:schedule:sch:... to 30 days
[REDIS_PERSIST_SUCCESS] Metadata persisted for sch:...
[REDIS_PERSIST_ERROR] Failed for sch:...: [error message]
```
- **Level**: DEBUG/ERROR
- **Info**: Redis ZSET/HASH operations, TTL set

### 6. Queue Decision
```
[QUEUE_DECISION] staged=true, delayMs=600000, stageBuffer=60000ms
```
- **Level**: LOG
- **Info**: Whether job goes to staging or running queue

### 7a. Staging Queue Path (> 60s away)
```
[QUEUE_STAGE_ADD_START] Adding to scheduler queue: stagingDelayMs=540000ms (540s)
[QUEUE_STAGE_SUCCESS] Added to scheduler queue: campaignId=campaign_123, scheduleId=sch:..., stagingIn=540s
[QUEUE_STAGE_ERROR] Failed to add to scheduler: [error message]
```
- **Level**: DEBUG/LOG/ERROR
- **Info**: Scheduler queue job details, delays

### 7b. Runner Queue Path (≤ 60s away)
```
[QUEUE_RUNNER_ADD_START] Adding directly to runner queue: delayMs=30000ms (30s)
[QUEUE_RUNNER_SUCCESS] Added directly to runner queue: campaignId=campaign_123, scheduleId=sch:..., runIn=30s
[QUEUE_RUNNER_ERROR] Failed to add to runner: [error message]
```
- **Level**: DEBUG/LOG/ERROR
- **Info**: Runner queue job details, delays

### 8. Schedule Complete
```
[SCHEDULE_COMPLETE] scheduleId=sch:..., staged=true, runAt=2025-11-07T14:30:00.000Z, delaySeconds=600
```
- **Level**: LOG
- **Info**: Final state of scheduled campaign

## Staging Processor Flow

### 1. Job Received
```
[STAGE_PROCESSOR_START] Processing stage job: scheduleId=sch:..., campaign=campaign_123, msUntilRun=61000ms
[STAGE_PROCESSOR_TIME] now=1730976000000ms, runAtMs=1730976600000ms, msUntilRun=61000ms (61s)
```
- **Level**: LOG/DEBUG
- **Triggered**: 60s before scheduled run time
- **Info**: Time calculations relative to now

### 2a. Time Ready - Move to Runner
```
[STAGE_TO_RUNNER] Moving to runner queue: scheduleId=sch:..., delayMs=1000ms
[STAGE_TO_RUNNER_SUCCESS] Moved to runner: scheduleId=sch:..., runIn=1s
```
- **Level**: LOG
- **Info**: Successfully staged → moved to runner with remaining delay

### 2b. Clock Drift Detected
```
[STAGE_CLOCK_DRIFT] Detected clock drift: msUntilRun=120000ms > stageBuffer=60000ms. Re-staging.
[STAGE_RESTAGE_SUCCESS] Re-staged with new delay: scheduleId=sch:..., newDelayMs=60000ms
[STAGE_RESTAGE_ERROR] Failed to re-stage: [error message]
```
- **Level**: WARN/LOG/ERROR
- **Info**: Clock drift detected and handled

### 3. Too Late to Process
```
[STAGE_TOO_LATE] Schedule is too far in the past: scheduleId=sch:..., msUntilRun=-10000ms
[STAGE_CLEANUP] Cleaned up stale schedule: sch:...
```
- **Level**: WARN/LOG
- **Info**: Stale job cleaned up

## Runner Processor Flow

### 1. Job Received
```
[RUN_PROCESSOR_START] Starting scheduled campaign execution: scheduleId=sch:..., campaign=campaign_123, org=org_123
[RUN_PROCESSOR_TIMING] scheduled=1730976600000ms, actual=1730976601234ms, diff=1234ms (1s late)
[RUN_PROCESSOR_LAUNCH_DTO] launchType=SCHEDULED, scheduledAt=2025-11-07T14:30:00Z
```
- **Level**: LOG/DEBUG
- **Info**: Timing accuracy (early/late), DTO info

### 2. Campaign Launch
```
[RUN_PROCESSOR_INVOKE] Calling campaignService.launchCampaign()
[RUN_PROCESSOR_SUCCESS] Campaign launched successfully: scheduleId=sch:..., campaign=campaign_123
[RUN_PROCESSOR_RESULT] Launch result: {...launch result object...}
```
- **Level**: DEBUG/LOG
- **Info**: Launch invocation and results

### 3. Cleanup
```
[RUN_PROCESSOR_CLEANUP_START] Cleaning Redis metadata for sch:...
[CLEANUP_ZREM] Removing from ZSET campaign:schedules: sch:...
[CLEANUP_DEL] Deleting HASH campaign:schedule:sch:...
[CLEANUP_SUCCESS] Cleaned schedule metadata: sch:...
[RUN_PROCESSOR_CLEANUP_SUCCESS] Cleaned up schedule metadata
[RUN_PROCESSOR_CLEANUP_WARN] Non-critical cleanup error: [error message]
```
- **Level**: DEBUG/LOG/WARN
- **Info**: Redis cleanup operations

### 4. Error Handling
```
[RUN_PROCESSOR_ERROR] Failed to launch campaign: scheduleId=sch:..., campaign=campaign_123, error=...
[RUN_PROCESSOR_RETRY] Job will be retried. Attempts remaining: 2
```
- **Level**: ERROR/WARN
- **Info**: Error details and retry info

## Cancel Schedule Flow

### 1. Cancel Request
```
[CANCEL_START] Cancelling schedule: sch:...
```
- **Level**: LOG

### 2. Queue Cleanup
```
[CANCEL_STAGE_JOB] Looking for staging job: stage:sch:...
[CANCEL_STAGE_SUCCESS] Removed staging job: stage:sch:...
[CANCEL_STAGE_NOT_FOUND] No staging job found: stage:sch:...
[CANCEL_RUNNER_JOB] Looking for runner job: sch:...
[CANCEL_RUNNER_SUCCESS] Removed runner job: sch:...
[CANCEL_RUNNER_NOT_FOUND] No runner job found: sch:...
```
- **Level**: DEBUG/LOG
- **Info**: Which jobs were found and removed

### 3. Redis Cleanup
```
[CANCEL_REDIS_CLEANUP] Cleaning Redis metadata for sch:...
[CANCEL_SUCCESS] Cancelled schedule: sch:...
[CANCEL_ERROR] Failed to cancel schedule sch:...: [error message]
```
- **Level**: DEBUG/LOG/ERROR
- **Info**: Cleanup status

## Get Upcoming Schedules Flow

### 1. Query Start
```
[GET_SCHEDULES_START] org=org_123, limit=100
[GET_SCHEDULES_QUERY] Querying ZSET for schedules from now(1730976000000) onwards
```
- **Level**: DEBUG

### 2. Results Found
```
[GET_SCHEDULES_FOUND] Found 5 upcoming schedules
```
- **Level**: LOG

### 3. Fetch Details
```
[GET_SCHEDULES_FETCH] Fetching metadata for sch:...
[GET_SCHEDULES_ADD] Adding schedule: sch:..., campaign=campaign_123, runAt=2025-11-07T14:30:00Z
[GET_SCHEDULES_SKIP] Skipping sch:... - different org
```
- **Level**: DEBUG

### 4. Complete
```
[GET_SCHEDULES_SUCCESS] Returned 5 schedules for org=org_123
[GET_SCHEDULES_ERROR] Failed to get upcoming schedules: [error message]
```
- **Level**: LOG/ERROR

## Recovery on Startup Flow

### 1. Recovery Start
```
[RECOVERY_START] Starting schedule recovery from Redis
[RECOVERY_QUERY] Querying schedules from 1730976000000-300000ms to now and beyond
```
- **Level**: LOG/DEBUG

### 2. Schedules Found
```
[RECOVERY_FOUND] Found 10 schedules to recover
```
- **Level**: LOG

### 3. Process Each Schedule
```
[RECOVERY_PROCESS] Processing schedule: sch:...
[RECOVERY_METADATA] org=org_123, campaign=campaign_123, runAtMs=1730976600000, delayMs=600000ms
[RECOVERY_SKIP_EXISTING] Job already queued: stage=true, run=false
[RECOVERY_INVALID] Schedule has no valid metadata: sch:...
[RECOVERY_CLEANUP_OLD] Schedule too old (10000ms past): sch:...
[RECOVERY_REQUEUE_STAGE] Re-queuing to scheduler: sch:..., delayMs=540000ms
[RECOVERY_REQUEUE_RUNNER] Re-queuing to runner: sch:..., delayMs=30000ms
```
- **Level**: DEBUG/WARN/LOG

### 4. Recovery Complete
```
[RECOVERY_COMPLETE] Recovered=8, Skipped=1, Cleaned=1, Total=10
[RECOVERY_ERROR] Failed to recover schedules: [error message]
```
- **Level**: LOG/ERROR

## Filtering Logs in Production

### By Tag
```bash
# All scheduling operations
grep '\[SCHEDULE' app.log

# All queue operations
grep '\[QUEUE' app.log

# All errors
grep '\[.*_ERROR' app.log

# All warnings
grep '\[.*_WARN' app.log

# Processor operations
grep '\[STAGE_\|RUN_' app.log
```

### By Severity
```bash
# Only errors
grep 'ERROR' app.log

# Only warnings and errors
grep 'WARN\|ERROR' app.log

# Debug details
grep 'DEBUG' app.log
```

### By Schedule ID
```bash
grep 'sch:campaign_123:1730976600000:' app.log
```

### By Campaign
```bash
grep 'campaign=campaign_123' app.log
```

### By Organization
```bash
grep 'org=org_123' app.log
```

## Example Log Sequence (Happy Path)

```
DEBUG [SCHEDULE_REQUEST] Received: org=org_123, campaign=campaign_123, launchType=SCHEDULED
DEBUG [SCHEDULE_PARSE_TIME] Parsing scheduledAt: 2025-11-07T14:30:00Z
LOG   [SCHEDULE_TIME_CALC] now=1730976000000ms, runAtMs=1730976600000ms, delayMs=600000ms (600s)
LOG   [SCHEDULE_ID_GENERATED] scheduleId=sch:campaign_123:1730976600000:a1b2c3d4
DEBUG [REDIS_PERSIST_START] Saving metadata for sch:campaign_123:1730976600000:a1b2c3d4
DEBUG [PERSIST_ZADD] Adding to ZSET campaign:schedules: score=1730976600000, member=sch:...
DEBUG [PERSIST_HSET] Adding to HASH campaign:schedule:sch:...: orgId=org_123, campaignId=campaign_123
DEBUG [PERSIST_TTL] Setting TTL for campaign:schedule:sch:... to 30 days
DEBUG [REDIS_PERSIST_SUCCESS] Metadata persisted for sch:...
LOG   [QUEUE_DECISION] staged=true, delayMs=600000, stageBuffer=60000ms
DEBUG [QUEUE_STAGE_ADD_START] Adding to scheduler queue: stagingDelayMs=540000ms (540s)
LOG   [QUEUE_STAGE_SUCCESS] Added to scheduler queue: campaignId=campaign_123, scheduleId=sch:..., stagingIn=540s
LOG   [SCHEDULE_COMPLETE] scheduleId=sch:..., staged=true, runAt=2025-11-07T14:30:00.000Z, delaySeconds=600

... 9 minutes later ...

LOG   [STAGE_PROCESSOR_START] Processing stage job: scheduleId=sch:..., campaign=campaign_123, msUntilRun=61000ms
DEBUG [STAGE_PROCESSOR_TIME] now=1730976540000ms, runAtMs=1730976600000ms, msUntilRun=60000ms (60s)
LOG   [STAGE_TO_RUNNER] Moving to runner queue: scheduleId=sch:..., delayMs=0ms
LOG   [STAGE_TO_RUNNER_SUCCESS] Moved to runner: scheduleId=sch:..., runIn=0s

... 1 minute later ...

LOG   [RUN_PROCESSOR_START] Starting scheduled campaign execution: scheduleId=sch:..., campaign=campaign_123, org=org_123
DEBUG [RUN_PROCESSOR_TIMING] scheduled=1730976600000ms, actual=1730976600001ms, diff=1ms (1ms late)
DEBUG [RUN_PROCESSOR_INVOKE] Calling campaignService.launchCampaign()
LOG   [RUN_PROCESSOR_SUCCESS] Campaign launched successfully: scheduleId=sch:..., campaign=campaign_123
DEBUG [RUN_PROCESSOR_CLEANUP_START] Cleaning Redis metadata for sch:...
DEBUG [CLEANUP_ZREM] Removing from ZSET campaign:schedules: sch:...
DEBUG [CLEANUP_DEL] Deleting HASH campaign:schedule:sch:...
DEBUG [CLEANUP_SUCCESS] Cleaned schedule metadata: sch:...
```

All logs are tagged, contextual, and easy to search and debug! 🎉
