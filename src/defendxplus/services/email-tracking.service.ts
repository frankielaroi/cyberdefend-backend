import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// Local enum definition
export enum PhishingEventType {
  CAMPAIGN_STARTED = 'CAMPAIGN_STARTED',
  CAMPAIGN_PAUSED = 'CAMPAIGN_PAUSED',
  CAMPAIGN_RESUMED = 'CAMPAIGN_RESUMED',
  CAMPAIGN_COMPLETED = 'CAMPAIGN_COMPLETED',
  CAMPAIGN_CANCELLED = 'CAMPAIGN_CANCELLED',
  EMAIL_QUEUED = 'EMAIL_QUEUED',
  EMAIL_SENT = 'EMAIL_SENT',
  EMAIL_DELIVERED = 'EMAIL_DELIVERED',
  EMAIL_OPENED = 'EMAIL_OPENED',
  LINK_CLICKED = 'LINK_CLICKED',
  CREDENTIALS_ENTERED = 'CREDENTIALS_ENTERED',
  PHISHING_REPORTED = 'PHISHING_REPORTED',
  EMAIL_BOUNCED = 'EMAIL_BOUNCED'
}

@Injectable()
export class EmailTrackingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Track email delivery status
   */
  async trackEmailDelivery(campaignId: string, targetEmail: string, status: 'delivered' | 'bounced', metadata?: any) {
    const target = await this.findTargetByEmail(campaignId, targetEmail);
    
    if (!target) {
      throw new NotFoundException('Target not found');
    }

    const eventType = status === 'delivered' ? PhishingEventType.EMAIL_DELIVERED : PhishingEventType.EMAIL_BOUNCED;
    const updateData: any = {};

    if (status === 'delivered') {
      updateData.emailDelivered = true;
      updateData.deliveredAt = new Date();
    } else {
      updateData.emailBounced = true;
      updateData.bouncedAt = new Date();
    }

    // Update target
    await this.prisma.phishingTarget.update({
      where: { id: target.id },
      data: updateData
    });

    // Create event
    await this.createTrackingEvent(campaignId, target.id, eventType, metadata);

    // Update campaign statistics
    await this.updateCampaignStats(campaignId, eventType);

    return { success: true, status, targetId: target.id };
  }

  /**
   * Track email opens via pixel tracking
   */
  async trackEmailOpen(campaignId: string, targetId: string, userAgent?: string, ipAddress?: string) {
    const target = await this.prisma.phishingTarget.findFirst({
      where: { id: targetId, campaignId }
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    // Only track first open
    if (!target.emailOpened) {
      await this.prisma.phishingTarget.update({
        where: { id: targetId },
        data: {
          emailOpened: true,
          openedAt: new Date(),
          userAgent,
          ipAddress
        }
      });

      await this.createTrackingEvent(campaignId, targetId, PhishingEventType.EMAIL_OPENED, {
        userAgent,
        ipAddress,
        location: await this.getLocationFromIP(ipAddress)
      });

      await this.updateCampaignStats(campaignId, PhishingEventType.EMAIL_OPENED);
    }

    return this.generateTrackingPixel();
  }

  /**
   * Track link clicks
   */
  async trackLinkClick(campaignId: string, targetId: string, redirectUrl: string, userAgent?: string, ipAddress?: string) {
    const target = await this.prisma.phishingTarget.findFirst({
      where: { id: targetId, campaignId }
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    // Update target - can have multiple clicks
    const updateData: any = {
      clickCount: { increment: 1 },
      userAgent,
      ipAddress
    };

    if (!target.linkClicked) {
      updateData.linkClicked = true;
      updateData.clickedAt = new Date();
    }

    await this.prisma.phishingTarget.update({
      where: { id: targetId },
      data: updateData
    });

    await this.createTrackingEvent(campaignId, targetId, PhishingEventType.LINK_CLICKED, {
      userAgent,
      ipAddress,
      redirectUrl,
      clickNumber: target.clickCount + 1,
      location: await this.getLocationFromIP(ipAddress)
    });

    // Only increment campaign stats on first click
    if (!target.linkClicked) {
      await this.updateCampaignStats(campaignId, PhishingEventType.LINK_CLICKED);
    }

    return { success: true, redirectUrl };
  }

  /**
   * Track credential submissions
   */
  async trackCredentialSubmission(
    campaignId: string, 
    targetId: string, 
    credentialData: any, 
    userAgent?: string, 
    ipAddress?: string
  ) {
    const target = await this.prisma.phishingTarget.findFirst({
      where: { id: targetId, campaignId }
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    // Only track first credential submission
    if (!target.credentialsEntered) {
      await this.prisma.phishingTarget.update({
        where: { id: targetId },
        data: {
          credentialsEntered: true,
          credentialsAt: new Date(),
          userAgent,
          ipAddress
        }
      });

      await this.createTrackingEvent(campaignId, targetId, PhishingEventType.CREDENTIALS_ENTERED, {
        userAgent,
        ipAddress,
        hasUsername: !!credentialData.username || !!credentialData.email,
        hasPassword: !!credentialData.password,
        fieldCount: Object.keys(credentialData).length,
        location: await this.getLocationFromIP(ipAddress)
      });

      await this.updateCampaignStats(campaignId, PhishingEventType.CREDENTIALS_ENTERED);
    }

    return { 
      success: true, 
      message: 'Credentials received successfully',
      redirectUrl: '/login-success' 
    };
  }

  /**
   * Track phishing reports
   */
  async trackPhishingReport(
    campaignId: string, 
    targetId: string, 
    reportMethod: string = 'manual',
    userAgent?: string, 
    ipAddress?: string
  ) {
    const target = await this.prisma.phishingTarget.findFirst({
      where: { id: targetId, campaignId }
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    // Only track first report
    if (!target.reportedPhishing) {
      await this.prisma.phishingTarget.update({
        where: { id: targetId },
        data: {
          reportedPhishing: true,
          reportedAt: new Date(),
          userAgent,
          ipAddress
        }
      });

      await this.createTrackingEvent(campaignId, targetId, PhishingEventType.PHISHING_REPORTED, {
        userAgent,
        ipAddress,
        reportMethod,
        location: await this.getLocationFromIP(ipAddress)
      });

      await this.updateCampaignStats(campaignId, PhishingEventType.PHISHING_REPORTED);
    }

    return { 
      success: true, 
      message: 'Thank you for reporting this suspicious email!' 
    };
  }

  /**
   * Get tracking statistics for a campaign
   */
  async getTrackingStats(campaignId: string) {
    const campaign = await this.prisma.phishingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        targets: true,
        events: {
          orderBy: { timestamp: 'desc' },
          take: 50
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const recentEvents = campaign.events.map(event => ({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
      userAgent: event.userAgent,
      ipAddress: event.ipAddress,
      location: event.location
    }));

    // Analyze user agents and locations
    const userAgents = campaign.targets
      .filter(t => t.userAgent)
      .map(t => this.parseUserAgent(t.userAgent))
      .reduce((acc, ua) => {
        acc[ua.browser] = (acc[ua.browser] || 0) + 1;
        return acc;
      }, {});

    const locations = campaign.events
      .filter(e => e.location)
      .map(e => e.location)
      .reduce((acc, loc) => {
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {});

    return {
      campaignId,
      stats: {
        totalTargets: campaign.targetCount,
        emailsSent: campaign.emailsSent,
        emailsDelivered: campaign.emailsDelivered,
        emailsOpened: campaign.emailsOpened,
        linksClicked: campaign.linksClicked,
        credentialsEntered: campaign.credentialsEntered,
        phishingReported: campaign.phishingReported,
        emailsBounced: campaign.emailsBounced
      },
      recentEvents,
      analytics: {
        topBrowsers: Object.entries(userAgents)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5),
        topLocations: Object.entries(locations)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
      }
    };
  }

  /**
   * Helper methods
   */

  private async findTargetByEmail(campaignId: string, email: string) {
    return this.prisma.phishingTarget.findFirst({
      where: { campaignId, email }
    });
  }

  private async createTrackingEvent(campaignId: string, targetId: string, type: PhishingEventType, metadata?: any) {
    await this.prisma.phishingEvent.create({
      data: {
        campaignId,
        targetId,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        location: metadata?.location
      }
    });
  }

  private async updateCampaignStats(campaignId: string, eventType: PhishingEventType) {
    const updateData: any = {};

    switch (eventType) {
      case PhishingEventType.EMAIL_SENT:
        updateData.emailsSent = { increment: 1 };
        break;
      case PhishingEventType.EMAIL_DELIVERED:
        updateData.emailsDelivered = { increment: 1 };
        break;
      case PhishingEventType.EMAIL_OPENED:
        updateData.emailsOpened = { increment: 1 };
        break;
      case PhishingEventType.LINK_CLICKED:
        updateData.linksClicked = { increment: 1 };
        break;
      case PhishingEventType.CREDENTIALS_ENTERED:
        updateData.credentialsEntered = { increment: 1 };
        break;
      case PhishingEventType.PHISHING_REPORTED:
        updateData.phishingReported = { increment: 1 };
        break;
      case PhishingEventType.EMAIL_BOUNCED:
        updateData.emailsBounced = { increment: 1 };
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.phishingCampaign.update({
        where: { id: campaignId },
        data: updateData
      });
    }
  }

  private generateTrackingPixel(): Buffer {
    // Return 1x1 transparent PNG
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
  }

  private async getLocationFromIP(ipAddress?: string): Promise<string | null> {
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return 'Internal Network';
    }

    // In a real implementation, you would use a geolocation service
    // For now, return a placeholder
    return 'Ghana, Accra'; // Placeholder location
  }

  private parseUserAgent(userAgent?: string): { browser: string; os: string; device: string } {
    if (!userAgent) {
      return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    }

    // Simple user agent parsing (in production, use a proper library)
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Mobile';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      device = 'Tablet';
    }

    return { browser, os, device };
  }

  /**
   * Generic email event tracking method
   */
  async trackEmailEvent(campaignId: string, targetId: string, eventType: PhishingEventType, metadata?: any) {
    switch (eventType) {
      case PhishingEventType.EMAIL_OPENED:
        return this.trackEmailOpen(campaignId, targetId, metadata?.userAgent, metadata?.ipAddress);
      case PhishingEventType.LINK_CLICKED:
        return this.trackLinkClick(campaignId, targetId, metadata?.redirectUrl, metadata?.userAgent, metadata?.ipAddress);
      case PhishingEventType.CREDENTIALS_ENTERED:
        return this.trackCredentialSubmission(campaignId, targetId, metadata, metadata?.userAgent, metadata?.ipAddress);
      case PhishingEventType.PHISHING_REPORTED:
        return this.trackPhishingReport(campaignId, targetId, metadata?.reportMethod, metadata?.userAgent, metadata?.ipAddress);
      default:
        // For other event types, create a generic tracking event
        const target = await this.prisma.phishingTarget.findFirst({
          where: { id: targetId, campaignId }
        });

        if (!target) {
          throw new NotFoundException('Target not found');
        }

        await this.createTrackingEvent(campaignId, targetId, eventType, metadata);
        await this.updateCampaignStats(campaignId, eventType);

        return { success: true, eventType };
    }
  }

  /**
   * Bulk tracking operations
   */

  async bulkTrackEmailDelivery(deliveryData: Array<{
    campaignId: string;
    targetEmail: string;
    status: 'delivered' | 'bounced';
    timestamp?: Date;
    metadata?: any;
  }>) {
    const results = [];

    for (const delivery of deliveryData) {
      try {
        const result = await this.trackEmailDelivery(
          delivery.campaignId,
          delivery.targetEmail,
          delivery.status,
          delivery.metadata
        );
        results.push({ ...result, email: delivery.targetEmail });
      } catch (error) {
        results.push({ 
          success: false, 
          email: delivery.targetEmail, 
          error: error.message 
        });
      }
    }

    return {
      processed: deliveryData.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}