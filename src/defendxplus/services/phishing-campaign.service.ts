import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailTrackingService, PhishingEventType } from './email-tracking.service';
import { 
  CreateCampaignDto, 
  UpdateCampaignDto, 
  CampaignQueryDto,
  LaunchCampaignDto,
  CampaignAnalyticsDto,
  BulkTargetsDto,
  CampaignOverviewDto,
  CampaignTargetDto
} from '../dto/phishing-campaign.dto';

// Local enum definitions (will be replaced with Prisma enums after generation)
enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED', 
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT', 
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

@Injectable()
export class PhishingCampaignService {
  constructor(
    private prisma: PrismaService,
    private emailTrackingService: EmailTrackingService
  ) {}

  /**
   * Campaign CRUD Operations
   */

  async createCampaign(organizationId: string, userId: string, createCampaignDto: CreateCampaignDto) {
    const { templateId, targets, scheduledAt, ...campaignData } = createCampaignDto;

    // Validate template exists
    const template = await this.prisma.phishingTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Process scheduledAt to ensure valid ISO-8601 format
    let processedScheduledAt: Date | undefined;
    if (scheduledAt) {
      try {
        // If scheduledAt doesn't include seconds or timezone, add them
        let dateString = scheduledAt;
        if (!dateString.includes(':') || dateString.split(':').length < 3) {
          // Add seconds if missing
          dateString = dateString.includes('T') ? dateString + ':00' : dateString;
        }
        if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
          // Add UTC timezone if missing
          dateString = dateString + 'Z';
        }
        processedScheduledAt = new Date(dateString);
        
        // Validate the date is valid and in the future
        if (isNaN(processedScheduledAt.getTime())) {
          throw new BadRequestException('Invalid scheduledAt date format');
        }
        if (processedScheduledAt <= new Date()) {
          throw new BadRequestException('Scheduled time must be in the future');
        }
      } catch (error) {
        throw new BadRequestException('Invalid scheduledAt date format. Please use ISO-8601 format (e.g., 2025-10-19T18:01:00Z)');
      }
    }

    // Create campaign with targets
    const campaign = await this.prisma.phishingCampaign.create({
      data: {
        ...campaignData,
        scheduledAt: processedScheduledAt,
        templateId,
        template: template.emailBodyHtml,
        subject: campaignData.subject || template.defaultSubject,
        senderName: campaignData.senderName || template.defaultSenderName,
        organizationId,
        createdBy: userId,
        targetCount: targets?.length || 0,
        targets: targets ? {
          create: targets.map(target => ({
            ...target,
            userId: target.userId || null
          }))
        } : undefined
      },
      include: {
        targets: true,
        events: true,
        organization: true,
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Create initial event
    await this.createCampaignEvent(campaign.id, PhishingEventType.CAMPAIGN_STARTED, {
      createdBy: userId,
      templateUsed: template.name
    });

    return campaign;
  }

  async getCampaigns(organizationId: string, query: CampaignQueryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      templateId,
      createdBy
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(templateId && { templateId }),
      ...(createdBy && { createdBy }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      }
    };

    const [campaigns, total] = await Promise.all([
      this.prisma.phishingCampaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { targets: true, events: true }
          }
        }
      }),
      this.prisma.phishingCampaign.count({ where })
    ]);

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getCampaignById(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        targets: {
          include: {
            events: {
              orderBy: { timestamp: 'desc' },
              take: 5
            }
          }
        },
        events: {
          orderBy: { timestamp: 'desc' }
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organization: true
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async updateCampaign(organizationId: string, campaignId: string, updateCampaignDto: UpdateCampaignDto) {
    const existingCampaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId }
    });

    if (!existingCampaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (existingCampaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot update running campaign');
    }

    const updatedCampaign = await this.prisma.phishingCampaign.update({
      where: { id: campaignId },
      data: updateCampaignDto,
      include: {
        targets: true,
        events: true,
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    return updatedCampaign;
  }

  async deleteCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot delete running campaign');
    }

    await this.prisma.phishingCampaign.delete({
      where: { id: campaignId }
    });

    return { message: 'Campaign deleted successfully' };
  }

  /**
   * Campaign Launch & Control
   */

  async launchCampaign(organizationId: string, campaignId: string, launchDto: LaunchCampaignDto) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: { targets: true }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('Campaign cannot be launched from current status');
    }

    if (campaign.targets.length === 0) {
      throw new BadRequestException('Campaign must have at least one target');
    }

    const scheduledAt = launchDto.scheduledAt ? new Date(launchDto.scheduledAt) : new Date();
    const isScheduled = scheduledAt > new Date();

    // Update campaign status
    const updatedCampaign = await this.prisma.phishingCampaign.update({
      where: { id: campaignId },
      data: {
        status: isScheduled ? CampaignStatus.SCHEDULED : CampaignStatus.RUNNING,
        scheduledAt,
        launchedAt: isScheduled ? null : new Date()
      },
      include: {
        targets: true,
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Create email jobs for immediate launch
    if (!isScheduled) {
      await this.createEmailJobs(campaignId, campaign.targets);
    }

    // Create launch event
    await this.createCampaignEvent(campaignId, 
      isScheduled ? PhishingEventType.CAMPAIGN_STARTED : PhishingEventType.CAMPAIGN_STARTED,
      { scheduledAt: scheduledAt.toISOString() }
    );

    return updatedCampaign;
  }

  async pauseCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException('Can only pause running campaigns');
    }

    const updatedCampaign = await this.prisma.phishingCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.PAUSED,
        pausedAt: new Date()
      }
    });

    // Cancel pending email jobs
    await this.prisma.emailJob.updateMany({
      where: {
        campaignId,
        status: JobStatus.PENDING
      },
      data: { status: JobStatus.CANCELLED }
    });

    await this.createCampaignEvent(campaignId, PhishingEventType.CAMPAIGN_PAUSED);

    return updatedCampaign;
  }

  async resumeCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Can only resume paused campaigns');
    }

    const updatedCampaign = await this.prisma.phishingCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.RUNNING,
        pausedAt: null
      }
    });

    await this.createCampaignEvent(campaignId, PhishingEventType.CAMPAIGN_RESUMED);

    return updatedCampaign;
  }

  async completeCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const updatedCampaign = await this.prisma.phishingCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.COMPLETED,
        completedAt: new Date()
      }
    });

    await this.createCampaignEvent(campaignId, PhishingEventType.CAMPAIGN_COMPLETED);

    return updatedCampaign;
  }

  /**
   * Target Management
   */

  async addTargets(organizationId: string, campaignId: string, bulkTargetsDto: BulkTargetsDto) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === CampaignStatus.RUNNING || campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Cannot add targets to running or completed campaign');
    }

    const { targets } = bulkTargetsDto;

    // Check for duplicate emails within campaign
    const existingEmails = await this.prisma.phishingTarget.findMany({
      where: {
        campaignId,
        email: { in: targets.map(t => t.email) }
      },
      select: { email: true }
    });

    const duplicateEmails = existingEmails.map(t => t.email);
    const newTargets = targets.filter(t => !duplicateEmails.includes(t.email));

    if (newTargets.length === 0) {
      throw new BadRequestException('All targets already exist in campaign');
    }

    // Create new targets
    const createdTargets = await this.prisma.phishingTarget.createMany({
      data: newTargets.map(target => ({
        ...target,
        campaignId,
        userId: target.userId || null
      }))
    });

    // Update campaign target count
    await this.prisma.phishingCampaign.update({
      where: { id: campaignId },
      data: {
        targetCount: { increment: createdTargets.count }
      }
    });

    return {
      added: createdTargets.count,
      duplicates: duplicateEmails.length,
      duplicateEmails
    };
  }

  async removeTarget(organizationId: string, campaignId: string, targetId: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot remove targets from running campaign');
    }

    const target = await this.prisma.phishingTarget.findFirst({
      where: { id: targetId, campaignId }
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    await this.prisma.phishingTarget.delete({
      where: { id: targetId }
    });

    // Update campaign target count
    await this.prisma.phishingCampaign.update({
      where: { id: campaignId },
      data: {
        targetCount: { decrement: 1 }
      }
    });

    return { message: 'Target removed successfully' };
  }

  /**
   * Analytics & Reporting
   */

  async getCampaignAnalytics(organizationId: string, campaignId: string): Promise<CampaignAnalyticsDto> {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        targets: true,
        events: true
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Calculate metrics
    const totalTargets = campaign.targetCount;
    const emailsSent = campaign.emailsSent;
    const emailsDelivered = campaign.emailsDelivered;
    const emailsOpened = campaign.emailsOpened;
    const linksClicked = campaign.linksClicked;
    const credentialsEntered = campaign.credentialsEntered;
    const phishingReported = campaign.phishingReported;

    // Calculate rates
    const deliveryRate = emailsSent > 0 ? (emailsDelivered / emailsSent) * 100 : 0;
    const openRate = emailsDelivered > 0 ? (emailsOpened / emailsDelivered) * 100 : 0;
    const clickRate = emailsDelivered > 0 ? (linksClicked / emailsDelivered) * 100 : 0;
    const credentialRate = emailsDelivered > 0 ? (credentialsEntered / emailsDelivered) * 100 : 0;
    const reportRate = emailsDelivered > 0 ? (phishingReported / emailsDelivered) * 100 : 0;

    // Department analytics
    const departmentAnalytics = await this.getDepartmentAnalytics(campaignId);

    // Timeline data (events over time)
    const timelineData = await this.getTimelineData(campaignId);

    return {
      campaignId,
      overview: {
        totalTargets,
        emailsSent,
        emailsDelivered,
        emailsOpened,
        linksClicked,
        credentialsEntered,
        usersReported: phishingReported,
        emailsBounced: campaign.emailsBounced
      },
      timeline: timelineData,
      userPerformance: [], // TODO: Implement user performance data
      departments: departmentAnalytics,
      riskMetrics: {
        overallScore: this.calculateCampaignRiskScore({
          clickRate,
          credentialRate,
          reportRate
        }),
        deliveryRate: parseFloat(deliveryRate.toFixed(2)),
        openRate: parseFloat(openRate.toFixed(2)),
        clickRate: parseFloat(clickRate.toFixed(2)),
        credentialRate: parseFloat(credentialRate.toFixed(2)),
        reportRate: parseFloat(reportRate.toFixed(2))
      }
    };
  }

  private async getDepartmentAnalytics(campaignId: string): Promise<any[]> {
    const departments = await this.prisma.phishingTarget.groupBy({
      by: ['department'],
      where: { 
        campaignId,
        department: { not: null }
      },
      _count: {
        _all: true
      },
      _sum: {
        clickCount: true
      }
    });

    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const targets = await this.prisma.phishingTarget.findMany({
          where: {
            campaignId,
            department: dept.department
          }
        });

        const totalTargets = targets.length;
        const emailsOpened = targets.filter(t => t.emailOpened).length;
        const linksClicked = targets.filter(t => t.linkClicked).length;
        const credentialsEntered = targets.filter(t => t.credentialsEntered).length;
        const phishingReported = targets.filter(t => t.reportedPhishing).length;

        return {
          name: dept.department || 'Unknown',
          totalUsers: totalTargets, // Using target count as proxy for total users
          clickRate: totalTargets > 0 ? (linksClicked / totalTargets) * 100 : 0,
          reportRate: totalTargets > 0 ? (phishingReported / totalTargets) * 100 : 0,
          credentialRate: totalTargets > 0 ? (credentialsEntered / totalTargets) * 100 : 0,
          riskScore: this.calculateDepartmentRiskScore({
            clickRate: totalTargets > 0 ? (linksClicked / totalTargets) * 100 : 0,
            credentialRate: totalTargets > 0 ? (credentialsEntered / totalTargets) * 100 : 0,
            reportRate: totalTargets > 0 ? (phishingReported / totalTargets) * 100 : 0
          })
        };
      })
    );

    return departmentStats;
  }

  private async getTimelineData(campaignId: string) {
    const events = await this.prisma.phishingEvent.findMany({
      where: { campaignId },
      orderBy: { timestamp: 'asc' },
      select: {
        type: true,
        timestamp: true
      }
    });

    // Group events by hour for timeline visualization
    const timelineMap = new Map();

    events.forEach(event => {
      const hour = new Date(event.timestamp).toISOString().substring(0, 13) + ':00:00.000Z';
      
      if (!timelineMap.has(hour)) {
        timelineMap.set(hour, {
          timestamp: hour,
          emails_sent: 0,
          emails_delivered: 0,
          emails_opened: 0,
          links_clicked: 0,
          credentials_entered: 0,
          phishing_reported: 0
        });
      }

      const timePoint = timelineMap.get(hour);
      
      switch (event.type) {
        case PhishingEventType.EMAIL_SENT:
          timePoint.emails_sent++;
          break;
        case PhishingEventType.EMAIL_DELIVERED:
          timePoint.emails_delivered++;
          break;
        case PhishingEventType.EMAIL_OPENED:
          timePoint.emails_opened++;
          break;
        case PhishingEventType.LINK_CLICKED:
          timePoint.links_clicked++;
          break;
        case PhishingEventType.CREDENTIALS_ENTERED:
          timePoint.credentials_entered++;
          break;
        case PhishingEventType.PHISHING_REPORTED:
          timePoint.phishing_reported++;
          break;
      }
    });

    return Array.from(timelineMap.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  private calculateCampaignRiskScore(metrics: { clickRate: number; credentialRate: number; reportRate: number }): number {
    const { clickRate, credentialRate, reportRate } = metrics;
    
    // Higher click and credential rates = higher risk
    // Higher report rate = lower risk (good security awareness)
    let riskScore = (clickRate * 0.4) + (credentialRate * 0.6) - (reportRate * 0.2);
    
    // Normalize to 0-10 scale
    riskScore = Math.max(0, Math.min(10, riskScore / 10));
    
    return parseFloat(riskScore.toFixed(2));
  }

  private calculateDepartmentRiskScore(metrics: { clickRate: number; credentialRate: number; reportRate: number }): number {
    return this.calculateCampaignRiskScore(metrics);
  }

  /**
   * Email Job Management
   */

  private async createEmailJobs(campaignId: string, targets: any[]) {
    const jobs = targets.map(target => ({
      campaignId,
      targetId: target.id,
      scheduledFor: new Date(),
      processingData: JSON.stringify({
        email: target.email,
        firstName: target.firstName,
        lastName: target.lastName
      })
    }));

    await this.prisma.emailJob.createMany({ data: jobs });
  }

  /**
   * Event Tracking
   */

  private async createCampaignEvent(campaignId: string, type: PhishingEventType, metadata?: any) {
    await this.prisma.phishingEvent.create({
      data: {
        campaignId,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  }

  async trackEmailEvent(campaignId: string, targetId: string, eventType: PhishingEventType, metadata?: any) {
    // Delegate to EmailTrackingService for better separation of concerns
    return this.emailTrackingService.trackEmailEvent(campaignId, targetId, eventType, metadata);
  }

  private async updateCampaignStatistics(campaignId: string, eventType: PhishingEventType) {
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

  /**
   * Search & Filtering
   */

  async searchTargets(organizationId: string, campaignId: string, query: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const targets = await this.prisma.phishingTarget.findMany({
      where: {
        campaignId,
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { department: { contains: query, mode: 'insensitive' } },
          { jobTitle: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 3
        }
      }
    });

    return targets;
  }

  /**
   * Live Statistics
   */

  async getLiveStats(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Get recent events (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const recentEvents = await this.prisma.phishingEvent.findMany({
      where: {
        campaignId,
        timestamp: { gte: twentyFourHoursAgo }
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        target: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            department: true
          }
        }
      }
    });

    return {
      campaignId,
      status: campaign.status,
      currentStats: {
        totalTargets: campaign.targetCount,
        emailsSent: campaign.emailsSent,
        emailsDelivered: campaign.emailsDelivered,
        emailsOpened: campaign.emailsOpened,
        linksClicked: campaign.linksClicked,
        credentialsEntered: campaign.credentialsEntered,
        phishingReported: campaign.phishingReported
      },
      recentEvents: recentEvents.map(event => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        target: event.target ? {
          email: event.target.email,
          name: `${event.target.firstName || ''} ${event.target.lastName || ''}`.trim(),
          department: event.target.department
        } : null,
        metadata: event.metadata ? JSON.parse(event.metadata) : null
      })),
      lastUpdated: new Date()
    };
  }
}