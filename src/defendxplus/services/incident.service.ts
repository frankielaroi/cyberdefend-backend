import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaService) {}

  async reportIncident(userId: string, organizationId: string, reportIncidentDto: any) {
    // TODO: Create proper incident model or use phishing events table
    
    // For now, we'll create a phishing event for incident reporting
    const incident = await this.prisma.phishingEvent.create({
      data: {
        type: 'EMAIL_REPORTED',
        metadata: JSON.stringify({
          reportedBy: userId,
          description: reportIncidentDto.description,
          emailSubject: reportIncidentDto.emailSubject,
          senderEmail: reportIncidentDto.senderEmail,
          receivedAt: reportIncidentDto.receivedAt,
          suspiciousElements: reportIncidentDto.suspiciousElements,
        }),
        ipAddress: reportIncidentDto.ipAddress,
        userAgent: reportIncidentDto.userAgent,
        // Note: We'll need to handle campaign and target relationships
        campaignId: reportIncidentDto.campaignId || 'unknown', // Handle unknown campaigns
        targetId: reportIncidentDto.targetId || 'unknown', // Handle unknown targets
      },
    });

    return {
      message: 'Incident reported successfully',
      incidentId: incident.id,
      data: incident,
    };
  }
}