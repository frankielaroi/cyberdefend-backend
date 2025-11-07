# Scheduled Campaigns Process - Complete Walkthrough

## High-Level Overview

When you schedule a campaign to run at a future time, here's what happens behind the scenes:

```
User: POST /campaigns/:id/schedule
           ↓
   Schedule Validator
           ↓
   Persist to Redis (ZSET + HASH)
           ↓
   Route to Queue:
   - If > 60s away → Staging Queue
   - If ≤ 60s away → Runner Queue
           ↓
   [TIME PASSES]
           ↓
   Staging Processor fires (60s before)
           ↓
   Move to Runner Queue
           ↓
   [TIME PASSES]
           ↓
   Runner Processor fires (at exact time)
           ↓
   Launch Campaign (Create + Send Emails)
           ↓
   Clean Redis
           ↓
   ✅ Emails Sent
```

---

## Step-by-Step Process

### **STEP 1: User Schedules Campaign**

```
POST /defendx-plus/campaigns/camp_123/schedule
Body: {
  "campaignId": "camp_123",
  "launchType": "SCHEDULED",
  "scheduledAt": "2025-11-07T15:30:00Z"
}
```

**Controller Flow:**
```typescript
// phishing-campaign.controller.ts
@Post(':campaignId/schedule')
async scheduleCampaign(@Body() dto: LaunchCampaignDto) {
  return this.campaignScheduler.scheduleCampaign(
    user.organizationId,
    campaignId,
    dto  // LaunchCampaignDto with SCHEDULED type
  );
}
```

**Time Calculation:**
- Current time: 2025-11-07T14:00:00Z
- Scheduled time: 2025-11-07T15:30:00Z
- Delay: 90 minutes = 5,400 seconds
- Status: Will be staged (delay > 60 seconds)

---

### **STEP 2: Campaign Scheduler Validates & Persists**

**In `campaign-scheduler.service.ts.scheduleCampaign():`**

```typescript
// 1. Validate
if (dto.launchType !== LaunchType.SCHEDULED) {
  throw error; // Must be SCHEDULED
}
if (!dto.scheduledAt) {
  throw error; // Must have time
}

// 2. Parse & Calculate
const runAtMs = Date.parse(dto.scheduledAt); // 1730976600000
const delayMs = runAtMs - Date.now();         // 5400000 (90 min)

// 3. Generate Schedule ID
const scheduleId = `sch:camp_123:1730976600000:a1b2c3d4`;

// 4. Persist to Redis (ZSET + HASH)
await client.zadd('campaign:schedules', 1730976600000, scheduleId);
await client.hset(`campaign:schedule:${scheduleId}`, {
  organizationId: 'org_123',
  campaignId: 'camp_123',
  runAt: '1730976600000',
  createdAt: '1730973000000'
});
await client.expire(`campaign:schedule:${scheduleId}`, 2592000); // 30 days

// 5. Route to queue
if (delayMs > 60_000) {
  // Stage in 30 minutes (90 min - 60 sec buffer)
  await schedulerQueue.add('stage-campaign', {
    organizationId: 'org_123',
    campaignId: 'camp_123',
    scheduleId: scheduleId,
    runAtMs: 1730976600000,
    launchDto: dto
  }, {
    jobId: `stage:${scheduleId}`,
    delay: 5_340_000,  // 89 minutes
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
}
```

**Result:**
```json
{
  "scheduleId": "sch:camp_123:1730976600000:a1b2c3d4",
  "staged": true,
  "queuedForRun": false,
  "runAt": "2025-11-07T15:30:00.000Z",
  "delaySeconds": 5400
}
```

**Logs at this point:**
```
[SCHEDULE_REQUEST] org=org_123, campaign=camp_123, launchType=SCHEDULED
[SCHEDULE_TIME_CALC] now=1730973000000ms, runAtMs=1730976600000ms, delayMs=3600000ms
[QUEUE_DECISION] staged=true, delayMs=3600000, stageBuffer=60000ms
[QUEUE_STAGE_SUCCESS] Added to scheduler queue, stagingIn=3540s (59m)
```

---

### **STEP 3: 89 Minutes Pass... Staging Processor Fires**

**At: 2025-11-07T14:29:00Z** (60 seconds before target time)

The `campaign-scheduler` queue fires the job that's been waiting.

**In `campaign-scheduler.processor.ts.handleStageToRunner():`**

```typescript
@Process('stage-campaign')
async handleStageToRunner(job: Job<{
  organizationId: string;
  campaignId: string;
  scheduleId: string;
  runAtMs: number;
  launchDto: LaunchCampaignDto;
}>) {
  const { organizationId, campaignId, scheduleId, runAtMs, launchDto } = job.data;
  const now = Date.now();
  const msUntilRun = runAtMs - now;

  // Should be approximately 60_000ms (60 seconds)
  if (msUntilRun <= 60_000 && msUntilRun > -5_000) {
    // Perfect! Time to move to runner queue
    await runnerQueue.add('run-campaign', {
      organizationId,
      campaignId,
      scheduleId,
      runAtMs,
      launchDto  // Pass the DTO through
    }, {
      jobId: scheduleId,
      delay: Math.max(msUntilRun, 0),  // About 60 seconds
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
  }
}
```

**Logs at this point:**
```
[STAGE_PROCESSOR_START] Processing stage job: scheduleId=sch_..., campaign=camp_123
[STAGE_PROCESSOR_TIME] msUntilRun=60000ms (60s)
[STAGE_TO_RUNNER] Moving to runner queue: scheduleId=sch_..., delayMs=60000ms
[STAGE_TO_RUNNER_SUCCESS] Moved to runner: scheduleId=sch_..., runIn=60s
```

---

### **STEP 4: 60 Seconds Pass... Runner Processor Fires**

**At: 2025-11-07T15:30:00Z** (Exact scheduled time!)

The `campaign-runner` queue fires the job that's been waiting.

**In `campaign-runner.processor.ts.handleRunCampaign():`**

```typescript
@Process('run-campaign')
async handleRunCampaign(job: Job) {
  const { organizationId, campaignId, scheduleId, runAtMs, launchDto } = job.data;
  const actualRunTime = Date.now();
  const timingDiffMs = actualRunTime - runAtMs;

  // timingDiffMs should be very close to 0!
  
  // Call the campaign service to launch
  const result = await this.campaignService.launchCampaign(
    organizationId,
    campaignId,
    launchDto  // DTO with SCHEDULED type and past scheduledAt time
  );

  // Clean Redis
  await client.zrem('campaign:schedules', scheduleId);
  await client.del(`campaign:schedule:${scheduleId}`);

  return { success: true, campaignId, scheduleId };
}
```

**Logs at this point:**
```
[RUN_PROCESSOR_START] ⚡ CAMPAIGN EXECUTION TRIGGERED: campaign=camp_123
[RUN_PROCESSOR_TIMING] scheduled=2025-11-07T15:30:00Z, actual=2025-11-07T15:30:00.123Z, diff=123ms LATE
[RUN_PROCESSOR_LAUNCH_DTO] launchType=SCHEDULED, scheduledAt=2025-11-07T15:30:00Z
[RUN_PROCESSOR_INVOKE] Calling campaignService.launchCampaign()
```

---

### **STEP 5: Campaign Service Launches Campaign**

**In `phishing-campaign.service.ts.launchCampaign():`**

This is called with the same DTO, but NOW the scheduledAt time is in the past!

```typescript
async launchCampaign(organizationId, campaignId, launchDto) {
  // Get campaign from database
  const campaign = await prisma.phishingCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: { targets: true }
  });

  // Parse the DTO-provided time
  const scheduledAt = new Date(launchDto.scheduledAt); // 2025-11-07T15:30:00Z
  const nowTime = new Date();                           // 2025-11-07T15:30:00Z (approximately)
  const isScheduled = scheduledAt > nowTime;            // FALSE! Time is in the past

  this.logger.log(`⏰ launch timing calculation:`);
  this.logger.log(`   scheduledAt=${scheduledAt.toISOString()}`);
  this.logger.log(`   nowTime=${nowTime.toISOString()}`);
  this.logger.log(`   diff=${scheduledAt.getTime() - nowTime.getTime()}ms`);
  this.logger.log(`   isScheduled=${isScheduled}`);  // Logs: false (IMMEDIATE mode)

  // Update campaign status to RUNNING
  const updatedCampaign = await prisma.phishingCampaign.update({
    where: { id: campaignId },
    data: {
      status: isScheduled ? 'SCHEDULED' : 'RUNNING',  // Sets to RUNNING
      scheduledAt,
      launchedAt: isScheduled ? null : new Date()     // Sets launchedAt to NOW
    }
  });

  // THIS IS THE KEY PART - Since isScheduled=false, we enter this block!
  if (!isScheduled) {  // TRUE! So we execute this
    // Create email jobs for all targets
    await this.createEmailJobs(campaignId, campaign.targets);

    // Process the emails (either via queue or synchronously)
    if (this.useQueue && this.phishingQueueService) {
      await this.phishingQueueService.addCampaignProcessingJob(
        campaignId,
        organizationId,
        'high'
      );
    } else {
      this.processEmailJobs(campaignId).catch(error => {
        this.logger.error('Email processing error:', error);
      });
    }
  } else {
    // This branch would be for future scheduling - SKIPPED
  }

  return updatedCampaign;
}
```

**Logs at this point:**
```
🚀 Attempting to launch campaign camp_123
📊 Campaign found: "Security Awareness Test", Status: SCHEDULED, Targets: 150
⏰ Campaign launch timing calculation:
   scheduledAt=2025-11-07T15:30:00.000Z
   nowTime=2025-11-07T15:30:00.123Z
   diff=-123ms
   isScheduled=false (IMMEDIATE)
✅ Campaign status updated to RUNNING
📧 [EMAIL_JOB_START] Creating 150 email jobs for campaign camp_123
✅ [EMAIL_JOB_CREATED] Email jobs created successfully for campaign camp_123
📨 [SYNC_PROCESS_START] Using synchronous processing for campaign camp_123
📨 [SYNC_PROCESS_STARTED] Email processing started asynchronously
```

---

### **STEP 6: Email Processing**

**In `phishing-campaign.service.ts.processEmailJobs():`**

```typescript
async processEmailJobs(campaignId) {
  // Get campaign + targets
  const campaign = await prisma.phishingCampaign.findUnique({
    where: { id: campaignId },
    include: { targets: true, organization: true }
  });

  // Get pending email jobs
  const pendingJobs = await prisma.emailJob.findMany({
    where: { campaignId, status: 'PENDING' }
  });

  // For each target, send email
  for (const job of pendingJobs) {
    const target = await prisma.phishingTarget.findUnique({
      where: { id: job.targetId }
    });

    // Personalize content
    const personalizedContent = this.personalizeEmailContent(
      campaign.template,
      target
    );

    // Generate tracking URL for this target
    const trackingUrl = this.generateTrackingUrl(
      campaign.landingPageUrl,
      campaignId,
      target.id
    );

    // Insert tracking pixel and link
    const emailWithTracking = this.insertTrackingElements(
      personalizedContent,
      campaignId,
      target.id,
      trackingUrl
    );

    // Send via email service
    const result = await this.emailService.sendEmail({
      to: target.email,
      subject: personalizedSubject,
      htmlContent: emailWithTracking,
      category: 'Phishing Campaign',
      fromEmail: campaign.senderEmail,
      fromName: campaign.senderName
    });

    // Mark as sent if successful
    if (result.success) {
      await prisma.emailJob.update({
        where: { id: job.id },
        data: { 
          status: 'SENT',
          lastAttemptAt: new Date()
        }
      });
    }
  }
}
```

**Result:** All 150 emails are sent to targets! ✅

---

## Key Differences from Immediate Launches

| Aspect | Immediate Launch | Scheduled Launch |
|--------|-----------------|-----------------|
| **Endpoint** | POST `/launch` | POST `/schedule` |
| **DTO Type** | `launchType: NOW` | `launchType: SCHEDULED` |
| **scheduledAt** | Optional/Ignored | Required (future ISO8601) |
| **Storage** | None (direct execution) | Redis ZSET + HASH (30 days) |
| **Execution** | Immediate | Two-queue staging |
| **Timing** | Sent right away | Sent at exact scheduled time |
| **isScheduled calc** | Based on DTO type OR time | Based on time comparison (future vs past) |

---

## Error Handling & Edge Cases

### **Case 1: Clock Drift (Woke up too early)**
```
If staging processor fires early (e.g., 65s before instead of 60s):
  - msUntilRun = 65_000ms
  - Condition: msUntilRun > STAGE_BUFFER_MS (65_000 > 60_000) → TRUE
  - Re-stages job with adjusted delay
  - Logs: [STAGE_CLOCK_DRIFT] Re-staging with new delay
```

### **Case 2: Job Too Old (After restart)**
```
If service restarts and recovery finds old schedule:
  - msUntilRun = -70_000ms (70s past target time)
  - Condition: msUntilRun <= -5_000 → TRUE
  - Cleans up Redis
  - Logs: [STAGE_TOO_LATE] Schedule too far in the past
```

### **Case 3: Immediate Scheduling (< 60s away)**
```
User schedules campaign for 30 seconds from now:
  - delayMs = 30_000ms
  - Condition: delayMs > STAGE_BUFFER_MS (30_000 > 60_000) → FALSE
  - Skips staging, queues directly to runner
  - Logs: [QUEUE_RUNNER_SUCCESS] Added directly to runner queue
```

### **Case 4: Retry on Failure**
```
If campaign launch fails:
  - Logged with [RUN_PROCESSOR_RETRY]
  - Bull retries up to 3 times with exponential backoff (2s → 4s → 8s)
  - Redis metadata kept for admin visibility
```

---

## Logging & Monitoring

All operations are logged with searchable tags:

```bash
# View all scheduling operations
docker logs backend 2>&1 | grep "\[SCHEDULE"

# View staging operations
docker logs backend 2>&1 | grep "\[STAGE"

# View runner operations
docker logs backend 2>&1 | grep "\[RUN_PROCESSOR"

# View specific campaign
docker logs backend 2>&1 | grep "camp_123"

# View with timestamps
docker logs backend --timestamps 2>&1 | grep "\[QUEUE"
```

---

## Summary Timeline Example

```
14:00:00 - User schedules campaign for 15:30:00 (90 min from now)
           → [SCHEDULE_REQUEST] Received
           → Saved to Redis
           → Queued to staging queue with 89 min delay

14:29:00 - Staging processor fires (60 sec before target)
           → [STAGE_PROCESSOR_START]
           → Moves to runner queue (60 sec delay)

14:30:00 - Runner processor fires (exact target time)
           → [RUN_PROCESSOR_START] ⚡ CAMPAIGN EXECUTION TRIGGERED
           → Calls launchCampaign()
           → isScheduled = false (time is now past)
           → [EMAIL_JOB_START] Creating email jobs
           → [SYNC_PROCESS_STARTED] Processing emails
           → 150 emails sent out! ✅
           → [CLEANUP_SUCCESS] Cleaned Redis

14:30:05 - Campaign emails arriving in inboxes
```

---

## Recovery on Service Restart

If the service crashes and restarts:

1. **Startup Hook:** `recoverSchedulesOnStartup()` runs
2. **Query Redis:** Looks for schedules within 5-minute grace window
3. **Re-queue:** 
   - If > 60s remaining → re-queue to staging
   - If < 60s remaining → re-queue to runner
   - If too old → clean up
4. **Resume:** Scheduling continues without data loss

```
Logs on restart:
[RECOVERY_START] Starting schedule recovery from Redis
[RECOVERY_FOUND] Found 5 schedules to recover
[RECOVERY_REQUEUE_STAGE] Re-queuing to scheduler: sch_..., delayMs=120000ms
[RECOVERY_REQUEUE_RUNNER] Re-queuing to runner: sch_..., delayMs=30000ms
[RECOVERY_COMPLETE] Recovered=2, Skipped=0, Cleaned=3
```
