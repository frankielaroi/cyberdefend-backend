# Phishing Campaign System - Production Readiness Checklist

## Overview

This checklist ensures your phishing campaign system is production-ready with all necessary components, scheduled tasks, monitoring, and error handling.

---

## ✅ 1. Queue System Setup (Bull + Redis)

### Required Components

#### Install Redis (if not already installed)

**For Production (Linux/Ubuntu):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

**For Windows (Development):**
- Download from: https://redis.io/download
- Or use Docker: `docker run -d -p 6379:6379 redis:alpine`

**For Heroku:**
```bash
heroku addons:create heroku-redis:mini
```

#### Environment Variables

Add to `.env`:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password  # Set in production!
REDIS_TLS=false  # Set to true for Heroku Redis

# Application URL (for tracking links)
APP_URL=https://your-production-domain.com
```

**For Heroku**, Redis URL is automatically set as `REDIS_URL`, but you need to parse it:

---

## ✅ 2. Email Queue Integration

### Create Email Queue Module

We need to integrate Bull queues for processing phishing emails asynchronously.

#### File: `src/defendxplus/processors/phishing-email.processor.ts`

```typescript
import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PhishingCampaignService } from '../services/phishing-campaign.service';

export interface PhishingEmailJob {
  campaignId: string;
  targetId: string;
  priority?: 'low' | 'medium' | 'high';
}

@Processor('phishing-email-queue')
export class PhishingEmailProcessor {
  private readonly logger = new Logger(PhishingEmailProcessor.name);

  constructor(
    private phishingCampaignService: PhishingCampaignService
  ) {}

  @Process('send-phishing-email')
  async handleSendPhishingEmail(job: Job<PhishingEmailJob>) {
    this.logger.log(`Processing phishing email job ${job.id} for campaign ${job.data.campaignId}`);
    
    // Process the email through the campaign service
    await this.phishingCampaignService.processSingleEmailJob(
      job.data.campaignId,
      job.data.targetId
    );
  }

  @Process('process-campaign-emails')
  async handleProcessCampaignEmails(job: Job<{ campaignId: string }>) {
    this.logger.log(`Processing all emails for campaign ${job.data.campaignId}`);
    
    await this.phishingCampaignService.processEmailJobs(job.data.campaignId);
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  onError(job: Job, error: any) {
    this.logger.error(`Failed job ${job.id} of type ${job.name}: ${error.message}`, error.stack);
  }
}
```

#### Update `defendxplus.module.ts`

```typescript
import { BullModule } from '@nestjs/bull';
import { PhishingEmailProcessor } from './processors/phishing-email.processor';

@Module({
  imports: [
    NotificationModule,
    BullModule.registerQueue({
      name: 'phishing-email-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200, // Keep last 200 failed jobs
      },
    }),
  ],
  providers: [
    // ... existing providers
    PhishingEmailProcessor,
  ],
  // ... rest of module
})
```

---

## ✅ 3. Scheduled Tasks Implementation

### Cron Jobs Already Implemented ✓

The following cron job is already in place:

#### `processScheduledCampaigns()` - Already Implemented ✓
- **Frequency**: Every minute
- **Purpose**: Launches campaigns that are scheduled to start
- **Status**: ✅ Complete

### Additional Recommended Cron Jobs

Add these to `PhishingCampaignService`:

#### 1. Retry Failed Email Jobs

```typescript
/**
 * Retry failed email jobs that haven't exceeded max attempts
 * Runs every 5 minutes
 */
@Cron('*/5 * * * *')
async retryFailedEmailJobs() {
  try {
    this.logger.log('Checking for failed email jobs to retry...');
    
    const failedJobs = await this.prisma.emailJob.findMany({
      where: {
        status: JobStatus.FAILED,
        attempts: {
          lt: this.prisma.emailJob.fields.maxAttempts
        },
        // Only retry jobs from last 24 hours
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      take: 50 // Limit to 50 at a time
    });

    if (failedJobs.length === 0) {
      return;
    }

    this.logger.log(`Retrying ${failedJobs.length} failed email jobs`);

    for (const job of failedJobs) {
      try {
        // Reset job to pending
        await this.prisma.emailJob.update({
          where: { id: job.id },
          data: { status: JobStatus.PENDING }
        });

        // Add small delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logger.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    this.logger.log(`Completed retry process for ${failedJobs.length} jobs`);
  } catch (error) {
    this.logger.error('Error in retryFailedEmailJobs:', error);
  }
}
```

#### 2. Clean Up Old Jobs

```typescript
/**
 * Clean up old email jobs (older than 30 days)
 * Runs daily at 2 AM
 */
@Cron('0 2 * * *')
async cleanupOldJobs() {
  try {
    this.logger.log('Cleaning up old email jobs...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await this.prisma.emailJob.deleteMany({
      where: {
        status: { in: [JobStatus.SENT, JobStatus.CANCELLED] },
        updatedAt: { lt: thirtyDaysAgo }
      }
    });

    this.logger.log(`Deleted ${result.count} old email jobs`);
  } catch (error) {
    this.logger.error('Error in cleanupOldJobs:', error);
  }
}
```

#### 3. Auto-Complete Stale Campaigns

```typescript
/**
 * Auto-complete campaigns that have been running for > 7 days
 * with all emails sent
 * Runs every 6 hours
 */
@Cron('0 */6 * * *')
async autoCompleteStaleCampaigns() {
  try {
    this.logger.log('Checking for stale campaigns to auto-complete...');
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const staleCampaigns = await this.prisma.phishingCampaign.findMany({
      where: {
        status: CampaignStatus.RUNNING,
        launchedAt: { lt: sevenDaysAgo }
      }
    });

    for (const campaign of staleCampaigns) {
      // Check if all jobs are complete
      const pendingJobs = await this.prisma.emailJob.count({
        where: {
          campaignId: campaign.id,
          status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] }
        }
      });

      if (pendingJobs === 0) {
        await this.completeCampaign(campaign.organizationId, campaign.id);
        this.logger.log(`Auto-completed stale campaign: ${campaign.id}`);
      }
    }
  } catch (error) {
    this.logger.error('Error in autoCompleteStaleCampaigns:', error);
  }
}
```

#### 4. Campaign Health Check

```typescript
/**
 * Monitor campaign health and alert on issues
 * Runs every 15 minutes
 */
@Cron('*/15 * * * *')
async campaignHealthCheck() {
  try {
    const runningCampaigns = await this.prisma.phishingCampaign.findMany({
      where: { status: CampaignStatus.RUNNING }
    });

    for (const campaign of runningCampaigns) {
      // Check for stuck jobs (processing for > 30 minutes)
      const stuckJobs = await this.prisma.emailJob.findMany({
        where: {
          campaignId: campaign.id,
          status: JobStatus.PROCESSING,
          lastAttemptAt: {
            lt: new Date(Date.now() - 30 * 60 * 1000)
          }
        }
      });

      if (stuckJobs.length > 0) {
        this.logger.warn(
          `Campaign ${campaign.id} has ${stuckJobs.length} stuck jobs. Resetting...`
        );

        // Reset stuck jobs to pending
        await this.prisma.emailJob.updateMany({
          where: { id: { in: stuckJobs.map(j => j.id) } },
          data: { status: JobStatus.PENDING }
        });
      }

      // Check high failure rate
      const totalJobs = await this.prisma.emailJob.count({
        where: { campaignId: campaign.id }
      });

      const failedJobs = await this.prisma.emailJob.count({
        where: { 
          campaignId: campaign.id,
          status: JobStatus.FAILED 
        }
      });

      const failureRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

      if (failureRate > 50) {
        this.logger.error(
          `⚠️ ALERT: Campaign ${campaign.id} has high failure rate: ${failureRate.toFixed(2)}%`
        );
        // TODO: Send alert notification to admins
      }
    }
  } catch (error) {
    this.logger.error('Error in campaignHealthCheck:', error);
  }
}
```

---

## ✅ 4. Database Optimization

### Add Indexes for Performance

Add to `schema.prisma`:

```prisma
model EmailJob {
  // ... existing fields

  @@index([campaignId, status])
  @@index([status, scheduledFor])
  @@index([targetId])
  @@index([createdAt])
}

model PhishingCampaign {
  // ... existing fields

  @@index([organizationId, status])
  @@index([status, scheduledAt])
  @@index([createdBy])
  @@index([createdAt])
}

model PhishingTarget {
  // ... existing fields

  @@index([campaignId])
  @@index([email])
  @@index([campaignId, emailSent])
}

model PhishingEvent {
  // ... existing fields

  @@index([campaignId, type])
  @@index([targetId, type])
  @@index([timestamp])
}
```

Run migration:
```bash
npx prisma migrate dev --name add_phishing_indexes
```

---

## ✅ 5. Rate Limiting & Throttling

### Email Rate Limiting

Add to `email.service.ts`:

```typescript
private readonly RATE_LIMITS = {
  perSecond: 10,
  perMinute: 100,
  perHour: 1000,
};

private emailsSentThisSecond = 0;
private emailsSentThisMinute = 0;
private emailsSentThisHour = 0;
private lastSecondReset = Date.now();
private lastMinuteReset = Date.now();
private lastHourReset = Date.now();

private async checkRateLimit(): Promise<void> {
  const now = Date.now();

  // Reset counters
  if (now - this.lastSecondReset >= 1000) {
    this.emailsSentThisSecond = 0;
    this.lastSecondReset = now;
  }
  if (now - this.lastMinuteReset >= 60000) {
    this.emailsSentThisMinute = 0;
    this.lastMinuteReset = now;
  }
  if (now - this.lastHourReset >= 3600000) {
    this.emailsSentThisHour = 0;
    this.lastHourReset = now;
  }

  // Check limits
  if (this.emailsSentThisSecond >= this.RATE_LIMITS.perSecond) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (this.emailsSentThisMinute >= this.RATE_LIMITS.perMinute) {
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
  if (this.emailsSentThisHour >= this.RATE_LIMITS.perHour) {
    await new Promise(resolve => setTimeout(resolve, 3600000));
  }

  // Increment counters
  this.emailsSentThisSecond++;
  this.emailsSentThisMinute++;
  this.emailsSentThisHour++;
}
```

Call `await this.checkRateLimit()` before sending each email.

---

## ✅ 6. Monitoring & Logging

### Add Application Monitoring

#### Install Winston Logger (Recommended)

```bash
npm install winston nest-winston
```

#### Configure Winston in `main.ts`

```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const app = await NestFactory.create(AppModule, {
  logger: WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, trace }) => {
            return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
          }),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  }),
});
```

### Add Health Check Endpoint

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      // Add Redis check
      // Add email service check
    ]);
  }
}
```

Install:
```bash
npm install @nestjs/terminus
```

---

## ✅ 7. Error Handling & Recovery

### Circuit Breaker for Email Service

```typescript
// src/defendxplus/services/circuit-breaker.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT = 60000; // 1 minute
  private readonly RETRY_TIMEOUT = 30000; // 30 seconds

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.RETRY_TIMEOUT) {
        this.state = 'HALF_OPEN';
        this.logger.log('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.logger.log('Circuit breaker is now CLOSED');
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.FAILURE_THRESHOLD) {
      this.state = 'OPEN';
      this.logger.error('Circuit breaker is now OPEN');
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
```

---

## ✅ 8. Security & Compliance

### Environment Variable Validation

Ensure all required env vars are set:

```typescript
// config/config.validation.ts
import * as Joi from 'joi';

export const configValidation = Joi.object({
  // ... existing validations
  
  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  
  // Email
  MAILTRAP_BULK_HOST: Joi.string().required(),
  MAILTRAP_SMTP_USER: Joi.string().required(),
  MAILTRAP_SMTP_PASS: Joi.string().required(),
  MAILTRAP_FROM_EMAIL: Joi.string().email().required(),
  
  // App URL for tracking
  APP_URL: Joi.string().uri().required(),
});
```

### Data Encryption

Encrypt sensitive campaign data:

```typescript
// Store tracking tokens encrypted
import * as crypto from 'crypto';

private encryptToken(data: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}
```

---

## ✅ 9. Testing Strategy

### Unit Tests

```bash
npm test src/defendxplus/services/phishing-campaign.service.spec.ts
```

### Integration Tests

```bash
npm run test:e2e
```

### Load Testing

Use Artillery or k6:

```yaml
# artillery-load-test.yml
config:
  target: 'https://your-api.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'Launch Campaign'
    flow:
      - post:
          url: '/api/v1/defendxplus/phishing/campaigns'
          json:
            name: 'Test Campaign'
            # ... campaign data
```

---

## ✅ 10. Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Redis running and accessible
- [ ] Database migrations applied
- [ ] Indexes created
- [ ] Domain verified in Mailtrap
- [ ] Tracking URLs configured
- [ ] Cron jobs enabled
- [ ] Logging configured
- [ ] Health checks passing

### Post-Deployment

- [ ] Test email sending with small campaign
- [ ] Verify scheduled campaigns launch correctly
- [ ] Check cron jobs are running
- [ ] Monitor error logs
- [ ] Verify tracking pixels work
- [ ] Test campaign pause/resume
- [ ] Check campaign statistics update
- [ ] Verify failed job retry mechanism

---

## ✅ 11. Production Environment Variables

```env
# Production .env
NODE_ENV=production
APP_URL=https://your-production-domain.com
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname?schema=public

# Redis (Heroku provides REDIS_URL automatically)
REDIS_HOST=redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# Email - Mailtrap Production
MAILTRAP_LIVE_HOST=live.smtp.mailtrap.io
MAILTRAP_BULK_HOST=bulk.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=587
MAILTRAP_SMTP_USER=api
MAILTRAP_SMTP_PASS=your-mailtrap-api-token
MAILTRAP_FROM_EMAIL=info@cyber360.tech
MAILTRAP_FROM_NAME=CyberDefend 360

# Security
JWT_SECRET=your-production-jwt-secret
ENCRYPTION_KEY=your-32-char-encryption-key

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
```

---

## ✅ 12. Monitoring Dashboards

### Recommended Metrics to Track

1. **Campaign Metrics**
   - Active campaigns
   - Scheduled campaigns
   - Emails sent per hour
   - Delivery rate
   - Open rate
   - Click rate

2. **System Health**
   - Queue length
   - Failed jobs count
   - Processing latency
   - Redis connection status
   - Database query performance

3. **Alerts**
   - Campaign failure rate > 50%
   - Queue backlog > 1000 jobs
   - Redis connection lost
   - Database connection lost
   - Email sending errors

### Tools

- **Grafana**: For visualizations
- **Prometheus**: For metrics collection
- **Sentry**: For error tracking
- **DataDog/New Relic**: All-in-one monitoring

---

## Summary

To make your phishing system production-ready, you need:

1. ✅ **Queue System**: Bull + Redis for async email processing
2. ✅ **Cron Jobs**: Already have scheduled campaign processing, add retry and cleanup jobs
3. ✅ **Database Indexes**: For query performance
4. ✅ **Rate Limiting**: Prevent email service throttling
5. ✅ **Monitoring**: Logging, health checks, alerts
6. ✅ **Error Handling**: Circuit breakers, retry logic
7. ✅ **Security**: Environment validation, data encryption
8. ✅ **Testing**: Unit, integration, and load tests
9. ✅ **Deployment**: Proper configuration and verification

Let me know which components you want me to implement first!
