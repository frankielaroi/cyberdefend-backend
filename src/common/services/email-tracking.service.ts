import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTrackingOptions {
  recipientEmail: string;
  emailSubject?: string;
  emailType?: string;
  userId?: string;
  notificationHistoryId?: string;
  phishingCampaignId?: string;
  metadata?: any;
}

export interface RecordOpenOptions {
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  deviceType?: string;
}

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new email tracking record and return the tracking ID
   */
  async createTracking(options: CreateTrackingOptions): Promise<string> {
    try {
      const trackingId = uuidv4();

      const tracking = await this.prisma.emailTracking.create({
        data: {
          trackingId,
          recipientEmail: options.recipientEmail,
          emailSubject: options.emailSubject,
          emailType: options.emailType || 'email',
          userId: options.userId,
          notificationHistoryId: options.notificationHistoryId,
          phishingCampaignId: options.phishingCampaignId,
          metadata: options.metadata ? JSON.stringify(options.metadata) : null,
          sentAt: new Date(),
        },
      });

      this.logger.log(
        `Created email tracking record for ${options.recipientEmail} with tracking ID: ${trackingId}`
      );

      return trackingId;
    } catch (error) {
      this.logger.error(`Failed to create email tracking record:`, error);
      throw error;
    }
  }

  /**
   * Record an email open event
   */
  async recordOpen(
    trackingId: string,
    options: RecordOpenOptions = {}
  ): Promise<boolean> {
    try {
      const tracking = await this.prisma.emailTracking.findUnique({
        where: { trackingId },
      });

      if (!tracking) {
        this.logger.warn(`Tracking ID not found: ${trackingId}`);
        return false;
      }

      const isFirstOpen = tracking.openCount === 0;
      const now = new Date();

      await this.prisma.emailTracking.update({
        where: { trackingId },
        data: {
          openedAt: isFirstOpen ? now : tracking.openedAt,
          openCount: { increment: 1 },
          lastOpenedAt: now,
          ipAddress: options.ipAddress || tracking.ipAddress,
          userAgent: options.userAgent || tracking.userAgent,
          location: options.location || tracking.location,
          deviceType: options.deviceType || tracking.deviceType,
        },
      });

      this.logger.log(
        `Recorded email open for tracking ID: ${trackingId} (${
          isFirstOpen ? 'first open' : `open count: ${tracking.openCount + 1}`
        })`
      );

      // If this is part of a phishing campaign, update campaign statistics
      if (tracking.phishingCampaignId && isFirstOpen) {
        await this.updatePhishingCampaignStats(tracking.phishingCampaignId);
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to record email open for tracking ID ${trackingId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Update phishing campaign statistics when an email is opened
   */
  private async updatePhishingCampaignStats(campaignId: string): Promise<void> {
    try {
      await this.prisma.phishingCampaign.update({
        where: { id: campaignId },
        data: {
          emailsOpened: { increment: 1 },
        },
      });

      this.logger.log(`Updated phishing campaign ${campaignId} email open count`);
    } catch (error) {
      this.logger.error(
        `Failed to update phishing campaign stats for ${campaignId}:`,
        error
      );
    }
  }

  /**
   * Generate a tracking pixel URL
   */
  generateTrackingPixelUrl(trackingId: string, baseUrl?: string): string {
    const domain = baseUrl || process.env.APP_URL || 'http://localhost:3000';
    return `${domain}/api/v1/track/open/${trackingId}`;
  }

  /**
   * Generate tracking pixel HTML
   */
  generateTrackingPixelHtml(trackingId: string, baseUrl?: string): string {
    const pixelUrl = this.generateTrackingPixelUrl(trackingId, baseUrl);
    return `<img src="${pixelUrl}" width="1" height="1" style="display:none;opacity:0;position:absolute;" alt="" />`;
  }

  /**
   * Inject tracking pixel into HTML content
   */
  injectTrackingPixel(htmlContent: string, trackingId: string, baseUrl?: string): string {
    const trackingPixel = this.generateTrackingPixelHtml(trackingId, baseUrl);
    
    // Try to inject before closing body tag
    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${trackingPixel}</body>`);
    }
    
    // If no body tag, append at the end
    return htmlContent + trackingPixel;
  }

  /**
   * Get tracking statistics for a recipient
   */
  async getTrackingStats(recipientEmail: string): Promise<any> {
    try {
      const trackings = await this.prisma.emailTracking.findMany({
        where: { recipientEmail },
        orderBy: { sentAt: 'desc' },
      });

      const totalSent = trackings.length;
      const totalOpened = trackings.filter((t) => t.openCount > 0).length;
      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      const totalOpens = trackings.reduce((sum, t) => sum + t.openCount, 0);

      return {
        recipientEmail,
        totalSent,
        totalOpened,
        totalOpens,
        openRate: Math.round(openRate * 100) / 100,
        recentEmails: trackings.slice(0, 10),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get tracking stats for ${recipientEmail}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get tracking details by tracking ID
   */
  async getTrackingById(trackingId: string): Promise<any> {
    try {
      return await this.prisma.emailTracking.findUnique({
        where: { trackingId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          phishingCampaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get tracking details for ${trackingId}:`, error);
      throw error;
    }
  }

  /**
   * Delete old tracking records (for GDPR compliance)
   */
  async cleanupOldTrackings(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.emailTracking.deleteMany({
        where: {
          sentAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `Cleaned up ${result.count} email tracking records older than ${daysToKeep} days`
      );

      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup old tracking records:', error);
      throw error;
    }
  }
}
