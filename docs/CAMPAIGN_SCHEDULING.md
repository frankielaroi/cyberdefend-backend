# Campaign Scheduling Implementation

## Overview

Three-layer safety system for phishing campaigns:
1. **Staging Processor** - Moves jobs 60 seconds before execution
2. **Polling Cron** - Every 60 seconds, checks for ready schedules
3. **Recovery on Startup** - Scans Redis within 5-minute grace window

Uses unified `LaunchCampaignDto`. Only difference between scheduled and immediate is `launchType` and `scheduledAt`.

## Architecture

### Three-Layer Safety System

```
SCHEDULED CAMPAIGN
        |
        ├─→ Layer 1: Staging Processor (60s before)
        │           Moves to runner queue
        │
        ├─→ Layer 2: Polling Cron (every 60s)
        │           Catches any stragglers
        │
        └─→ Layer 3: Recovery on Startup
                    Handles crash scenarios
        |
        ▼
   RUNNER QUEUE (Ready)
        |
        ▼
   RUNNER PROCESSOR (At scheduled time)
        |
        ▼
   Emails Sent! ✅
```

### Queue Flow
- **Stage-Campaign Queue** (campaign-scheduler):
  - Triggers 60 seconds before scheduled run time
  - Moves job from scheduler to runner queue
  - Handles clock drift with re-staging

- **Run-Campaign Queue** (campaign-runner):
  - Executes campaign at exact scheduled time
  - Calls `PhishingCampaignService.launchCampaign()` with the same DTO
  - Cleans Redis metadata on success

- **Polling Cron Job** (every 60 seconds):
  - Checks Redis for schedules with ≤60s remaining
  - Queues any that aren't already in runner queue
  - Provides safety net if staging processor fails
  - See: [Campaign Scheduler Cron Docs](./CAMPAIGN_SCHEDULER_CRON.md)

### Redis Schema
- **ZSET** `campaign:schedules`: Sorted by runAtMs (UTC epoch ms)
  - Score: runAtMs
  - Members: scheduleId
  
- **HASH** `campaign:schedule:{scheduleId}`: Metadata
  - organizationId
  - campaignId
  - runAt (epoch ms)
  - createdAt (epoch ms)
  - TTL: 30 days

## API

### Schedule Campaign (Unified DTO)
**POST** `/defendx-plus/campaigns/:campaignId/schedule`

Request (uses `LaunchCampaignDto` with SCHEDULED type):
```json
{
  "campaignId": "camp_123456789",
  "launchType": "SCHEDULED",
  "scheduledAt": "2025-11-07T14:30:00Z"
}
```

Response (201):
```json
{
  "scheduleId": "sch:campaign_123:1730976600000:a1b2c3d4",
  "staged": true,
  "queuedForRun": false,
  "runAt": "2025-11-07T14:30:00.000Z",
  "delaySeconds": 3600
}
```

### Launch Campaign Immediately (Same DTO)
**POST** `/defendx-plus/campaigns/:campaignId/launch`

Request (uses `LaunchCampaignDto` with NOW type):
```json
{
  "campaignId": "camp_123456789",
  "launchType": "NOW"
}
```

Note: Both endpoints use the same `LaunchCampaignDto` - scheduled campaigns simply have `launchType: SCHEDULED` and `scheduledAt` populated.

## Implementation Details

### Files Created
1. **processors/campaign-scheduler.processor.ts** - Staging processor (60s buffer)
2. **processors/campaign-runner.processor.ts** - Campaign execution processor
3. **services/campaign-scheduler.service.ts** - Scheduling logic & Redis persistence

### Files Modified
1. **dto/phishing-campaign.dto.ts** - Removed `ScheduleCampaignDto` (now using `LaunchCampaignDto`)
2. **controllers/phishing-campaign.controller.ts** - Added `/schedule` endpoint using `LaunchCampaignDto`
3. **defendxplus.module.ts** - Registered queues, services, and processors

## Behavior

### When scheduling a campaign:

1. **Validate DTO**: 
   - Require `launchType === SCHEDULED`
   - Require `scheduledAt` to be present and valid ISO 8601
   - Reject if > 5 seconds in past

2. **Persist**: Save schedule to Redis
   - ZSET: `campaign:schedules` (for queries)
   - HASH: `campaign:schedule:{scheduleId}` (metadata)

3. **Enqueue** (based on time until run):
   - **> 60s away**: Queue to `campaign-scheduler` with delay = (time - 60s)
   - **≤ 60s away**: Queue directly to `campaign-runner` with remaining delay

### When stage-campaign fires (60s before):

1. Re-check remaining time
2. Move to `campaign-runner` with exact remaining delay
3. Handle clock drift by re-staging if needed
4. Pass along the original `LaunchCampaignDto`

### When run-campaign fires (at scheduled time):

1. Call `campaignService.launchCampaign(organizationId, campaignId, launchDto)`
2. The same DTO is used for both scheduled and immediate launches
3. On success: Clean Redis metadata (ZSET + HASH)
4. On failure: Retry up to 3 times with exponential backoff (2s, 4s, 8s)

## Error Handling

- **Invalid launchType**: Returns 400 if not SCHEDULED for `/schedule` endpoint
- **Missing scheduledAt**: Returns 400 when launchType is SCHEDULED
- **Invalid scheduledAt**: Returns 400 with detailed message
- **Past scheduledAt**: Returns 400 if > 5 seconds past
- **Campaign launch fails**: Job retries 3 times, metadata kept for debugging
- **Clock drift**: Scheduler detects and re-stages
- **Service restart**: `recoverSchedulesOnStartup()` re-queues pending schedules

## Redis Durability

- Configure Redis with AOF (Append-Only File) or RDB + fsync
- Delayed jobs survive server restarts
- Schedule metadata persists for 30 days

## Scaling

- **Concurrency**: Tune via queue processor options
- **Sharding**: Partition by organizationId or campaignId if needed
- **Monitoring**: Track job progress via Bull's built-in metrics

## Testing

```bash
# Start development
npm run start:dev

# Ensure Redis is running
docker run -p 6379:6379 redis:7

# Schedule a campaign 2 minutes in future
curl -X POST "http://localhost:3000/defendx-plus/campaigns/campaign_123/schedule" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign_123",
    "launchType": "SCHEDULED",
    "scheduledAt": "'$(node -e "console.log(new Date(Date.now()+120000).toISOString())")'"
  }'
```

## Admin Operations (Future)

- Get upcoming schedules: `campaignScheduler.getUpcomingSchedules(orgId, limit)`
- Cancel schedule: `campaignScheduler.cancelSchedule(scheduleId)`
- Recover on startup: `campaignScheduler.recoverSchedulesOnStartup()` (call in app init)

