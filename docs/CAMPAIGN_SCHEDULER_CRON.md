# Campaign Scheduler Cron Job - 60-Second Polling

## Overview

Every 60 seconds, a background cron job polls Redis to find all schedules that are ready to run (≤60 seconds remaining) and automatically loads them to the runner queue. This provides an additional safety net to ensure no scheduled campaigns are missed.

## Purpose

**Problem Solved:**
- Ensures that all schedules within the 60-second execution window are in the runner queue
- Catches schedules that may have slipped through the two-queue staging system
- Provides recovery if the staging processor fails or is delayed
- Guards against clock drift or timing issues

## How It Works

### Cron Schedule
```
@Cron('*/60 * * * * *')  // Every 60 seconds
```

This runs the polling job every 60 seconds indefinitely.

### Polling Logic

**Step 1: Query Time Window**
```
now = current time
cutoffTime = now + 60_000ms (60 seconds)
```

**Step 2: Find Ready Schedules**
```
Redis ZRANGEBYSCORE query:
  ZSET: campaign:schedules
  Min Score: now (current time)
  Max Score: now + 60_000ms
  
Returns all scheduleIds where:
  now ≤ runAtMs ≤ now + 60_000ms
```

This finds all campaigns scheduled to run within the next 60 seconds.

**Step 3: Check Each Schedule**
For each schedule found:
1. Get metadata from Redis HASH
2. Check if already in runner queue (skip if yes)
3. Check if still in staging queue (skip if yes)
4. If not queued anywhere, add to runner queue immediately

**Step 4: Add to Runner Queue**
```typescript
await runnerQueue.add('run-campaign', {
  organizationId,
  campaignId,
  scheduleId,
  runAtMs,
  launchDto: {
    launchType: 'SCHEDULED',
    scheduledAt: ISO8601_date,
    campaignId
  }
}, {
  jobId: scheduleId,
  delay: msUntilRun,  // How many ms until actual run time
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});
```

## Example Scenario

### Timeline
```
14:00:00 - User schedules campaign for 14:05:00 (5 minutes away)
           → Stored in Redis ZSET with score=1730976300000
           → Since 300s > 60s, queued to staging (240s delay)

14:03:00 - Cron job fires (first time)
           [CRON_POLL_START] Polling Redis for schedules ready
           [CRON_TIME_WINDOW] now=1730976180000, cutoffTime=1730976240000
           [CRON_FOUND] Found 0 schedules (5 min campaign not in window yet)
           [CRON_POLL_COMPLETE] queued=0, skipped=0

14:04:00 - Cron job fires (second time)
           [CRON_POLL_START] Polling Redis for schedules ready
           [CRON_TIME_WINDOW] now=1730976240000, cutoffTime=1730976300000
           [CRON_FOUND] Found 1 schedule (now 1 min away)
           [CRON_PROCESS] Processing: sch_camp_123...
           [CRON_ALREADY_QUEUED] Already in runner queue (staging moved it there)
           [CRON_POLL_COMPLETE] queued=0, skipped=1

14:04:58 - Staging processor fires (60s before)
           Moves job from staging queue to runner queue

14:05:00 - Runner processor fires
           Executes campaign, sends emails ✅
```

## Benefits Over Staging Queue Alone

| Scenario | Staging Queue | Polling Cron | Result |
|----------|--------------|-------------|--------|
| Normal flow | ✅ Moves to runner 60s before | ✅ Finds it | Campaign runs |
| Staging processor crashes | ❌ Job never moves | ✅ Cron finds it anyway | Campaign still runs ✅ |
| Clock drift (staging fires late) | ❌ Timing off | ✅ Cron ensures it's queued | Safety net ✅ |
| High load (delays) | ❌ Might miss window | ✅ Cron catches stragglers | Prevents misses ✅ |
| Service restarts | ❌ Jobs lost | ✅ Recovery scans within 5min | Data preserved ✅ |

## Logging Output

### Typical Run (Nothing to Do)
```
[CRON_POLL_START] Polling Redis for schedules ready to run (≤60s away)
[CRON_TIME_WINDOW] now=1730976180000ms, cutoffTime=1730976240000ms (60s window)
[CRON_FOUND] Found 0 schedules ready to run
[CRON_NONE] No schedules in 60-second window
[CRON_POLL_COMPLETE] Polling complete: queued=0, skipped=0, failed=0, total=0
```

### With Schedules Found
```
[CRON_POLL_START] Polling Redis for schedules ready to run (≤60s away)
[CRON_TIME_WINDOW] now=1730976240000ms, cutoffTime=1730976300000ms (60s window)
[CRON_FOUND] Found 3 schedules ready to run
[CRON_PROCESS] Processing schedule: sch_camp_123_...
[CRON_METADATA] org=org_123, campaign=camp_123, msUntilRun=45000ms
[CRON_ALREADY_QUEUED] Schedule already in runner queue: sch_camp_123_...
[CRON_PROCESS] Processing schedule: sch_camp_456_...
[CRON_METADATA] org=org_456, campaign=camp_456, msUntilRun=55000ms
[CRON_IN_STAGING] Schedule still in staging queue: sch_camp_456_...
[CRON_PROCESS] Processing schedule: sch_camp_789_...
[CRON_METADATA] org=org_789, campaign=camp_789, msUntilRun=30000ms
[CRON_QUEUE_TO_RUNNER] Queueing to runner: sch_camp_789_..., msUntilRun=30000ms
[CRON_QUEUED_SUCCESS] Added to runner queue: sch_camp_789_...
[CRON_POLL_COMPLETE] Polling complete: queued=1, skipped=2, failed=0, total=3
```

### Error Case
```
[CRON_POLL_START] Polling Redis for schedules ready to run (≤60s away)
[CRON_FOUND] Found 2 schedules ready to run
[CRON_PROCESS] Processing schedule: sch_camp_123_...
[CRON_QUEUE_ERROR] Failed to queue sch_camp_123_...: Connection timeout
[CRON_POLL_COMPLETE] Polling complete: queued=0, skipped=0, failed=1, total=1
```

## Filtering Logs

```bash
# View all polling operations
docker logs backend 2>&1 | grep "\[CRON_"

# View only successful queues
docker logs backend 2>&1 | grep "\[CRON_QUEUED_SUCCESS"

# View polling complete summaries
docker logs backend 2>&1 | grep "\[CRON_POLL_COMPLETE"

# View errors only
docker logs backend 2>&1 | grep "\[CRON_.*ERROR"

# Watch in real-time (every 60s)
docker logs backend --follow 2>&1 | grep "\[CRON_"
```

## Configuration

### Change Polling Interval

To change from 60 seconds to a different interval, edit the decorator:

```typescript
// Current: Every 60 seconds
@Cron('*/60 * * * * *')

// Every 30 seconds (more aggressive)
@Cron('*/30 * * * * *')

// Every 90 seconds (less aggressive)
@Cron('*/90 * * * * *')

// Every 5 minutes
@Cron('0 */5 * * * *')
```

See [NestJS Schedule Documentation](https://docs.nestjs.com/techniques/task-scheduling) for more cron patterns.

### Memory Usage

The polling adds minimal overhead:
- **CPU**: Runs every 60 seconds for ~100-500ms (depending on Redis load)
- **Memory**: No persistent memory usage
- **Redis**: Single ZRANGEBYSCORE query + hash lookups
- **Network**: Minimal (O(n) where n = schedules in 60-second window)

## Edge Cases Handled

### Case 1: Already in Runner Queue
```
[CRON_ALREADY_QUEUED] Schedule already in runner queue
→ Skip (no duplicate queueing)
```

### Case 2: Still in Staging Queue
```
[CRON_IN_STAGING] Schedule still in staging queue
→ Skip (let staging processor handle it)
```

### Case 3: Invalid Metadata
```
[CRON_INVALID] Schedule has no valid metadata
→ Skip (prevent errors)
```

### Case 4: Queue Error
```
[CRON_QUEUE_ERROR] Failed to queue...: [error message]
→ Log and continue (don't crash entire poll)
→ Will retry next polling cycle
```

## Interaction with Other Components

### With Staging Processor
```
Timeline:
1. Cron polls every 60s
2. Staging processor also fires 60s before
3. They both find the schedule:
   - Staging processor moves it first
   - Cron finds it already queued, skips it
   ✅ No race condition (idempotent)
```

### With Recovery on Startup
```
Timeline:
1. Service starts
2. recoverSchedulesOnStartup() scans 5-min window
3. Cron polls every 60s continuously
4. Together they ensure no schedules are lost:
   - Recovery handles old schedules from crashes
   - Cron ensures all are queued for execution
   ✅ Comprehensive coverage
```

### With Runner Processor
```
Timeline:
1. Cron queues schedule to runner
2. Runner processor picks it up at scheduled time
3. Runner calls launchCampaign()
4. Emails are sent ✅
```

## Monitoring & Alerting

### Alert Conditions

**High Failure Rate:**
```bash
# Check if failed count is rising
docker logs backend 2>&1 | grep "\[CRON_POLL_COMPLETE" | tail -5
```

**Lag Detection:**
If `msUntilRun` is negative, the schedule is already past due:
```
[CRON_QUEUE_TO_RUNNER] msUntilRun=-5000ms (LATE!)
```

**Large Backlog:**
If `Found` count grows:
```
[CRON_FOUND] Found 50 schedules (unusually high!)
```

## Performance Characteristics

| Metric | Value |
|--------|-------|
| **Execution Frequency** | Every 60 seconds |
| **Typical Duration** | 100-500ms (depends on Redis) |
| **CPU Impact** | Negligible (runs once/minute) |
| **Memory Impact** | None (no persistent state) |
| **Redis Queries** | 1 ZRANGEBYSCORE + N hash lookups |
| **Queued Per Run** | Usually 0-5 (depends on schedule density) |

## Disabling the Cron Job

If you need to disable polling temporarily:

```typescript
// Comment out the @Cron decorator
// @Cron('*/60 * * * * *')
async pollAndLoadReadySchedules(): Promise<void> {
  // Code won't run
}
```

**Warning**: Disabling this means staging processor is your only safety net. Not recommended for production.

## Summary

The 60-second polling cron job provides:
- ✅ **Safety Net**: Catches schedules missed by staging
- ✅ **Resilience**: Handles staging processor failures
- ✅ **Recovery**: Supplements startup recovery
- ✅ **Simplicity**: Just queues to runner, idempotent
- ✅ **Observability**: Detailed logging for monitoring
- ✅ **Performance**: Minimal overhead

Combined with the staging processor and recovery mechanism, scheduled campaigns have triple redundancy to ensure they always execute! 🚀
