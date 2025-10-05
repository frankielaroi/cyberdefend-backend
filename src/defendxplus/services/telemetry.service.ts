import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TelemetryService {
  constructor(private prisma: PrismaService) {}

  async processTelemetry(apiKey: string, telemetryDto: any) {
    // Get agent info
    const agent = await this.prisma.agent.findUnique({
      where: { apiKey },
      include: { organization: true },
    });

    if (!agent) {
      throw new BadRequestException('Invalid API key');
    }

    // Validate telemetry payload
    if (!telemetryDto.events || !Array.isArray(telemetryDto.events)) {
      throw new BadRequestException('Invalid telemetry payload - events array required');
    }

    // Process telemetry events
    const processedEvents = [];
    
    for (const event of telemetryDto.events) {
      try {
        const telemetryEvent = await this.prisma.telemetryEvent.create({
          data: {
            type: event.type,
            source: event.source || 'Unknown',
            data: JSON.stringify(event.data || {}),
            severity: event.severity || 'INFO',
            timestamp: new Date(event.timestamp) || new Date(),
            agentId: agent.id,
            userId: event.userId,
          },
        });

        processedEvents.push(telemetryEvent.id);

        // Check if this event should trigger an alert
        await this.checkForAlerts(telemetryEvent, agent.organizationId);
        
      } catch (error) {
        console.error('Error processing telemetry event:', error);
        // Continue processing other events
      }
    }

    // Update agent last seen
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

  private async checkForAlerts(telemetryEvent: any, organizationId: string) {
    // TODO: Implement alert rules engine
    // For now, we'll skip direct alert creation since it requires rules
    // This will be implemented when we add the detection rules system
    
    console.log(`Security event detected: ${telemetryEvent.severity} - ${telemetryEvent.type}`);
  }
}