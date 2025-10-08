import { Module } from '@nestjs/common';
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
import { EmailTrackingService } from './services/email-tracking.service';
import { AnalyticsService } from './services/analytics.service';

@Module({
  providers: [
    PhishingService,
    IncidentService,
    AgentService,
    TelemetryService,
    AlertService,
    ScanService,
    PhishingCampaignService,
    PhishingTemplateService,
    EmailTrackingService,
    AnalyticsService,
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
    EmailTrackingService,
    AnalyticsService,
  ],
})
export class DefendxPlusModule {}