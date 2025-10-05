import { Module } from '@nestjs/common';
import { PhishingController } from './controllers/phishing.controller';
import { IncidentController } from './controllers/incident.controller';
import { AgentController } from './controllers/agent.controller';
import { TelemetryController } from './controllers/telemetry.controller';
import { AlertController } from './controllers/alert.controller';
import { ScanController } from './controllers/scan.controller';
import { PhishingService } from './services/phishing.service';
import { IncidentService } from './services/incident.service';
import { AgentService } from './services/agent.service';
import { TelemetryService } from './services/telemetry.service';
import { AlertService } from './services/alert.service';
import { ScanService } from './services/scan.service';

@Module({
  providers: [
    PhishingService,
    IncidentService,
    AgentService,
    TelemetryService,
    AlertService,
    ScanService,
  ],
  controllers: [
    PhishingController,
    IncidentController,
    AgentController,
    TelemetryController,
    AlertController,
    ScanController,
  ],
  exports: [
    PhishingService,
    IncidentService,
    AgentService,
    TelemetryService,
    AlertService,
    ScanService,
  ],
})
export class DefendxPlusModule {}