import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelemetryBatchDto } from '../dto/telemetry.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(private prisma: PrismaService) {}

  async processTelemetry(agent: { id: string; organizationId: string }, telemetryDto: TelemetryBatchDto) {
    // Only link events to users in the agent's own organization
    const requestedUserIds = [...new Set(telemetryDto.events.map((e) => e.userId).filter(Boolean))];
    const allowedUserIds = new Set(
      requestedUserIds.length
        ? (
            await this.prisma.user.findMany({
              where: { id: { in: requestedUserIds }, organizationId: agent.organizationId },
              select: { id: true },
            })
          ).map((u) => u.id)
        : [],
    );

    const processedEvents = [];

    for (const event of telemetryDto.events) {
      try {
        const telemetryEvent = await this.prisma.telemetryEvent.create({
          data: {
            type: event.type,
            source: event.source || 'Unknown',
            data: JSON.stringify(event.data || {}),
            severity: event.severity || 'INFO',
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
            agentId: agent.id,
            userId: event.userId && allowedUserIds.has(event.userId) ? event.userId : null,
          },
        });

        processedEvents.push(telemetryEvent.id);

        await this.checkForAlerts(telemetryEvent, agent.organizationId);
      } catch (error) {
        this.logger.error(`Error processing telemetry event from agent ${agent.id}: ${error.message}`);
      }
    }

    await this.prisma.agent.update({
      where: { id: agent.id },
      data: { lastSeen: new Date() },
    });

    return {
      message: 'Telemetry processed successfully',
      processedEvents: processedEvents.length,
      totalEvents: telemetryDto.events.length,
      agentId: agent.id,
      timestamp: new Date(),
    };
  }

  private async checkForAlerts(telemetryEvent: any, _organizationId: string) {
    // TODO: Implement alert rules engine
    // For now, we'll skip direct alert creation since it requires rules
    // This will be implemented when we add the detection rules system
    
    this.logger.debug(`Security event detected: ${telemetryEvent.severity} - ${telemetryEvent.type}`);
  }
}