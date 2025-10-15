# Bull Queue Integration for Phishing Campaigns

## ✅ Implementation Complete

The Bull queue system has been successfully integrated into the phishing campaign system for robust, scalable async email processing.

---

## 📦 What Was Added

### 1. **Phishing Email Processor** (`processors/phishing-email.processor.ts`)

The main Bull queue processor that handles:
- Individual email sending jobs
- Campaign-wide email processing  
- Failed job retries
- Scheduled campaign processing

**Key Features:**
- ✅ Automatic retries with exponential backoff
- ✅ Job prioritization (low, normal, high)
- ✅ Progress tracking
- ✅ Comprehensive error handling
- ✅ Lifecycle event logging

### 2. **Phishing Queue Service** (`services/phishing-queue.service.ts`)

Service layer for interacting with Bull queues:
- Add single email jobs
- Add bulk email jobs
- Monitor queue statistics
- Retry failed jobs
- Manage queue state (pause/resume)
- Clean old jobs

### 3. **Module Configuration** (`defendxplus.module.ts`)

Configured Bull queue with:
- **3 automatic retries** with exponential backoff (2s, 4s, 8s)
- **Rate limiting**: Max 10 jobs per second
- **Job retention**: Last 100 completed, 200 failed
- **60-second timeout** per email job

### 4. **Service Integration** (`phishing-campaign.service.ts`)

Updated to use queue when available:
- Backward compatible (works with or without Redis)
- Automatic fallback to synchronous processing
- Queue integration in campaign launch
- Queue integration in scheduled campaigns

---

## 🎯 How It Works

### Normal Flow (Without Queue)

```
Launch Campaign → Create Email Jobs → Process Synchronously → Send Emails
```

### Queue Flow (With Queue - Recommended)

```
Launch Campaign → Create Email Jobs → Add to Bull Queue → Worker Processes → Send Emails
                                            ↓
                                      [Redis Storage]
                                            ↓
                                 [Automatic Retries & Monitoring]
```

---

## 📋 Queue Job Types

### 1. `send-phishing-email`

**Purpose**: Send a single phishing email to a target

**Data:**
```typescript
{
  campaignId: string;
  targetId: string;
  priority?: 'low' | 'normal' | 'high';
}
```

**Behavior:**
- Retrieves campaign and target details
- Personalizes email content
- Generates tracking URLs
- Sends email via EmailService
- Updates job status and campaign statistics
- **Retries**: Up to 3 times with exponential backoff

**Usage:**
```typescript
await phishingQueueService.addEmailJob(campaignId, targetId, 'high');
```

---

### 2. `process-campaign-emails`

**Purpose**: Process all pending email jobs for a campaign

**Data:**
```typescript
{
  campaignId: string;
  organizationId: string;
}
```

**Behavior:**
- Finds all pending email jobs for campaign
- Processes each job sequentially
- Updates progress
- Handles errors gracefully

**Usage:**
```typescript
await phishingQueueService.addCampaignProcessingJob(campaignId, orgId, 'high');
```

---

### 3. `retry-failed-jobs`

**Purpose**: Retry a batch of failed email jobs

**Data:**
```typescript
{
  campaignId: string;
  jobIds: string[];
}
```

**Behavior:**
- Resets failed jobs to PENDING
- Processes them again
- Tracks retry attempts

**Usage:**
```typescript
await phishingQueueService.addRetryJob(campaignId, ['job1', 'job2']);
```

---

## 🚀 Benefits Over Synchronous Processing

| Feature | Synchronous | Bull Queue |
|---------|-------------|------------|
| **Reliability** | ❌ Fails if server restarts | ✅ Jobs persisted in Redis |
| **Retries** | ❌ Manual | ✅ Automatic (3x exponential) |
| **Scalability** | ❌ Single process | ✅ Multiple workers |
| **Monitoring** | ❌ Limited | ✅ Full job tracking |
| **Rate Limiting** | ⚠️ Manual | ✅ Built-in (10/second) |
| **Priority** | ❌ FIFO only | ✅ Priority queues |
| **Recovery** | ❌ Lost on crash | ✅ Resume from Redis |
| **Performance** | ⚠️ Blocking | ✅ Non-blocking |

---

## 🔧 Configuration

### Queue Options (in `defendxplus.module.ts`)

```typescript
BullModule.registerQueue({
  name: 'phishing-email-queue',
  defaultJobOptions: {
    attempts: 3,                  // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',        // 2s, 4s, 8s delays
      delay: 2000,
    },
    removeOnComplete: 100,        // Keep last 100 completed jobs
    removeOnFail: 200,            // Keep last 200 failed jobs
    timeout: 60000,               // 60 second timeout per job
  },
  limiter: {
    max: 10,                      // Max 10 jobs
    duration: 1000,               // per second
  },
})
```

### Customization

You can adjust these values based on your needs:

**Higher Volume:**
```typescript
limiter: {
  max: 50,        // Increase to 50 emails/second
  duration: 1000,
}
```

**More Retries:**
```typescript
attempts: 5,      // Try 5 times before giving up
backoff: {
  type: 'exponential',
  delay: 1000,    // Start with 1 second
}
```

**Longer Retention:**
```typescript
removeOnComplete: 1000,  // Keep 1000 completed jobs
removeOnFail: 500,       // Keep 500 failed jobs
```

---

## 📊 Monitoring Queue

### Get Queue Statistics

```typescript
const stats = await phishingQueueService.getQueueStats();

console.log(stats);
// {
//   waiting: 45,      // Jobs waiting to be processed
//   active: 10,       // Jobs currently being processed
//   completed: 1250,  // Successfully completed jobs
//   failed: 12,       // Failed jobs
//   delayed: 5,       // Delayed jobs (scheduled for later)
//   paused: 0,        // Jobs paused
//   total: 1322       // Total jobs
// }
```

### Get Failed Jobs for Campaign

```typescript
const failedJobs = await phishingQueueService.getFailedJobsForCampaign(campaignId);

for (const job of failedJobs) {
  console.log(`Job ${job.id} failed: ${job.failedReason}`);
  console.log(`Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
  console.log(`Data:`, job.data);
}
```

### Retry a Specific Job

```typescript
await phishingQueueService.retryJob('job-id-123');
```

### Clean Old Jobs

```typescript
// Remove completed/failed jobs older than 24 hours
await phishingQueueService.cleanOldJobs(24 * 60 * 60 * 1000);
```

---

## 🎛️ Queue Management

### Pause Queue (Stop Processing)

```typescript
await phishingQueueService.pauseQueue();
// Jobs will queue up but not be processed
```

**Use Cases:**
- Emergency stop during email service outage
- Maintenance window
- Rate limit exceeded

### Resume Queue (Start Processing)

```typescript
await phishingQueueService.resumeQueue();
// Queued jobs will start processing again
```

### Remove a Job

```typescript
await phishingQueueService.removeJob('job-id-123');
```

---

## 📈 Production Deployment

### Prerequisites

1. **Redis** must be running
2. **REDIS_URL** or Redis connection details in environment variables

### Environment Variables

```env
# Redis Configuration (Required for Bull Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=false  # Set true for Heroku Redis

# Optional: Redis URL (Heroku provides this automatically)
REDIS_URL=redis://user:pass@host:port
```

### Heroku Deployment

```bash
# Add Redis addon (if not already added)
heroku addons:create heroku-redis:mini

# Redis URL is automatically set as REDIS_URL
# No additional configuration needed!

# Deploy
git push heroku main

# Check queue is working
heroku logs --tail | grep "Bull Queue enabled"
```

### Verify Queue is Working

Check logs for this message on startup:
```
[PhishingCampaignService] ✅ Bull Queue enabled for phishing campaigns
```

If you see this instead, Redis is not available:
```
[PhishingCampaignService] ⚠️ Bull Queue not available, using synchronous processing
```

---

## 🧪 Testing the Queue

### Test 1: Simple Campaign Launch

```typescript
// Create and launch a campaign
const campaign = await phishingCampaignService.createCampaign(
  organizationId, 
  userId, 
  campaignData
);

await phishingCampaignService.launchCampaign(
  organizationId,
  campaign.id,
  { launchType: 'NOW' }
);

// Check queue stats
const stats = await phishingQueueService.getQueueStats();
console.log(`Jobs in queue: ${stats.waiting + stats.active}`);
```

### Test 2: Monitor Job Progress

```typescript
// Watch logs for job lifecycle events
// [PhishingEmailProcessor] Job 123 (send-phishing-email) is now active
// [PhishingEmailProcessor] ✅ Job 123 completed successfully
```

### Test 3: Test Failure & Retry

```typescript
// Temporarily pause email service or use invalid email
// Job will fail and automatically retry 3 times

// Check failed jobs
const failed = await phishingQueueService.getFailedJobsForCampaign(campaignId);
console.log(`Failed jobs: ${failed.length}`);

// Manually retry
await phishingQueueService.retryJob(failed[0].id);
```

---

## 🔍 Debugging

### Common Issues

**1. Queue not processing jobs**

**Symptoms:**
- Jobs stuck in "waiting" state
- No worker activity logs

**Solutions:**
```bash
# Check Redis is running
redis-cli ping  # Should return PONG

# Check Redis connection
heroku redis:info

# Verify queue configuration
# Look for "Bull Queue enabled" in logs
```

**2. Jobs failing repeatedly**

**Symptoms:**
- All jobs end up in "failed" status
- Error messages in logs

**Solutions:**
```bash
# Check error details
const failed = await phishingQueueService.getFailedJobsForCampaign(campaignId);
console.log(failed[0].failedReason);

# Common causes:
# - Invalid sender email
# - Email service down
# - Domain not verified
# - Network issues
```

**3. High memory usage**

**Symptoms:**
- Application memory growing
- Slow performance

**Solutions:**
```typescript
// Clean old jobs more frequently
await phishingQueueService.cleanOldJobs(12 * 60 * 60 * 1000); // 12 hours

// Reduce job retention
removeOnComplete: 50,  // Instead of 100
removeOnFail: 100,     // Instead of 200
```

---

## 📊 Queue Dashboard (Optional)

### Bull Board - Web UI for Bull Queues

Install Bull Board for visual queue monitoring:

```bash
npm install @bull-board/express @bull-board/api
```

**Setup (add to main.ts):**

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// In your main.ts or app setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue } = createBullBoard({
  queues: [new BullAdapter(phishingEmailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

**Access:** `http://localhost:3000/admin/queues`

**Features:**
- View all jobs by status
- Retry failed jobs
- Delete jobs
- View job details and errors
- Monitor queue metrics in real-time

---

## 🚀 Performance Tips

### 1. Batch Job Addition

Instead of:
```typescript
for (const target of targets) {
  await queue.addEmailJob(campaignId, target.id);
}
```

Do this:
```typescript
const targetIds = targets.map(t => t.id);
await queue.addBulkEmailJobs(campaignId, targetIds);
```

### 2. Use Priorities

```typescript
// High priority for immediate campaigns
await queue.addCampaignProcessingJob(campaignId, orgId, 'high');

// Normal priority for scheduled
await queue.addCampaignProcessingJob(campaignId, orgId, 'normal');

// Low priority for retries
await queue.addRetryJob(campaignId, jobIds, 'low');
```

### 3. Monitor Queue Size

```typescript
setInterval(async () => {
  const stats = await queue.getQueueStats();
  if (stats.waiting > 1000) {
    console.warn('⚠️ Queue backlog detected:', stats.waiting);
    // Consider scaling workers or pausing campaigns
  }
}, 60000); // Check every minute
```

---

## ✅ Verification Checklist

After deployment:

- [ ] Check "Bull Queue enabled" message in logs
- [ ] Launch a test campaign with 2-3 targets
- [ ] Verify jobs appear in queue (check stats)
- [ ] Watch for "Job X is now active" messages
- [ ] Confirm "Job X completed successfully" messages
- [ ] Check emails were actually sent
- [ ] Verify campaign statistics updated
- [ ] Test failure scenario (invalid email)
- [ ] Confirm automatic retry happens
- [ ] Check queue stats show correct counts

---

## 🎉 Benefits Summary

With Bull Queue integration, your phishing campaign system now has:

✅ **Reliability** - Jobs survive server restarts
✅ **Automatic Retries** - 3 attempts with exponential backoff  
✅ **Rate Limiting** - Prevent email service throttling
✅ **Scalability** - Process jobs across multiple workers
✅ **Monitoring** - Full visibility into job states
✅ **Priority Handling** - Important campaigns processed first
✅ **Error Recovery** - Graceful handling of failures
✅ **Performance** - Non-blocking async processing

**Your phishing campaigns are now production-ready!** 🚀
