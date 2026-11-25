import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PhishingController } from './controllers/phishing.controller';
import { IncidentController } from './controllers/incident.controller';
import { AgentController } from './controllers/agent.controller';
import { TelemetryController } from './controllers/telemetry.controller';
import { AlertController } from './controllers/alert.controller';
import { ScanController } from './controllers/scan.controller';
import { PhishingCampaignController } from './controllers/phishing-campaign.controller';
import { PhishingTemplateController } from './controllers/phishing-template.controller';
import { LegacyPhishingController } from './controllers/legacy-phishing.controller';
import { PhishingService } from './services/phishing.service';
import { IncidentService } from './services/incident.service';
import { AgentService } from './services/agent.service';
import { TelemetryService } from './services/telemetry.service';
import { AlertService } from './services/alert.service';
import { ScanService } from './services/scan.service';
import { PhishingCampaignService } from './services/phishing-campaign.service';
import { PhishingTemplateService } from './services/phishing-template.service';
import { PhishingTrackingService } from './services/phishing-tracking.service';
import { AnalyticsService } from './services/analytics.service';
import { PhishingQueueService } from './services/phishing-queue.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { HealthCheckService } from './services/health-check.service';
import { CampaignSchedulerService } from './services/campaign-scheduler.service';
import { NotificationModule } from '../notification/notification.module';
import { PhishingEmailProcessor } from './processors/phishing-email.processor';
import { CampaignSchedulerProcessor } from './processors/campaign-scheduler.processor';
import { CampaignRunnerProcessor } from './processors/campaign-runner.processor';

@Module({
  imports: [
    NotificationModule,
    BullModule.registerQueue({
      name: 'phishing-email-queue',
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay, doubles each retry
        },
        removeOnComplete: 100, // Keep last 100 completed jobs for monitoring
        removeOnFail: 200, // Keep last 200 failed jobs for debugging
        timeout: 60000, // Job timeout: 60 seconds per email
      },
      limiter: {
        max: 10, // Max 10 jobs processed
        duration: 1000, // per 1 second (rate limiting)
      },
    }),
    BullModule.registerQueue(
      {
        name: 'campaign-scheduler',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'campaign-runner',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }
    ),
  ],
  providers: [
    PhishingService,
    IncidentService,
    AgentService,
    TelemetryService,
    AlertService,
    ScanService,
    PhishingCampaignService,
    PhishingTemplateService,
    PhishingTrackingService,
    AnalyticsService,
    PhishingQueueService,
    CircuitBreakerService,
    HealthCheckService,
    CampaignSchedulerService,
    PhishingEmailProcessor,
    CampaignSchedulerProcessor,
    CampaignRunnerProcessor,
  ],
  controllers: [
    PhishingController,
    IncidentController,
    AgentController,
    TelemetryController,
    AlertController,
    ScanController,
    PhishingCampaignController,
    PhishingTemplateController,
    LegacyPhishingController,
  ],
  exports: [
    PhishingService,
    IncidentService,
    AgentService,
    TelemetryService,
    AlertService,
    ScanService,
    PhishingCampaignService,
    PhishingTemplateService,
    PhishingTrackingService,
    AnalyticsService,
    PhishingQueueService,
    CampaignSchedulerService,
  ],
})
export class DefendxPlusModule {}