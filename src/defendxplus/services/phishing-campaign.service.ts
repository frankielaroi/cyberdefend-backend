import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { EmailTrackingService, PhishingEventType } from './email-tracking.service';
import { EmailService } from '../../notification/services/email.service';
import { PhishingQueueService } from './phishing-queue.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  LaunchCampaignDto,
  CampaignAnalyticsDto,
  BulkTargetsDto,
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
  private readonly logger = new Logger(PhishingCampaignService.name);
  private useQueue: boolean = false;

  constructor(
    private prisma: PrismaService,
    private emailTrackingService: EmailTrackingService,
    private emailService: EmailService,
    private circuitBreaker: CircuitBreakerService,
    @Optional() private phishingQueueService?: PhishingQueueService
  ) {
    // Check if queue service is available
    this.useQueue = !!this.phishingQueueService;
    if (this.useQueue) {
      this.logger.log('✅ Bull Queue enabled for phishing campaigns');
    } else {
      this.logger.warn('⚠️ Bull Queue not available, using synchronous processing');
    }
    
    // Initialize circuit breaker for email service
    this.circuitBreaker.getCircuit('email-service', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      monitoringPeriod: 120000
    });
  }

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
    this.logger.log(`🚀 Attempting to launch campaign ${campaignId} for organization ${organizationId}`);
    
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: { targets: true }
    });

    if (!campaign) {
      this.logger.error(`❌ Campaign launch failed: Campaign ${campaignId} not found for organization ${organizationId}`);
      throw new NotFoundException('Campaign not found');
    }

    this.logger.log(`📊 Campaign ${campaignId} found: ${campaign.name}, Status: ${campaign.status}, Targets: ${campaign.targets.length}`);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      this.logger.error(`❌ Campaign launch failed: Campaign ${campaignId} has invalid status ${campaign.status}. Expected DRAFT or SCHEDULED.`);
      throw new BadRequestException('Campaign cannot be launched from current status');
    }

    if (campaign.targets.length === 0) {
      this.logger.error(`❌ Campaign launch failed: Campaign ${campaignId} has no targets`);
      throw new BadRequestException('Campaign must have at least one target');
    }

    const scheduledAt = launchDto.scheduledAt ? new Date(launchDto.scheduledAt) : new Date();
    const nowTime = new Date();
    const isScheduled = scheduledAt > nowTime;

    this.logger.log(`⏰ Campaign ${campaignId} launch timing calculation:`);
    this.logger.log(`   scheduledAt=${scheduledAt.toISOString()}`);
    this.logger.log(`   nowTime=${nowTime.toISOString()}`);
    this.logger.log(`   diff=${scheduledAt.getTime() - nowTime.getTime()}ms`);
    this.logger.log(`   isScheduled=${isScheduled ? 'SCHEDULED' : 'IMMEDIATE'} at ${scheduledAt.toISOString()}`);

    // Update campaign status
    try {
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

      this.logger.log(`✅ Campaign ${campaignId} status updated to ${updatedCampaign.status}`);

      // Create email jobs for immediate launch
      if (!isScheduled) {
        this.logger.log(`📧 [EMAIL_JOB_START] Creating ${campaign.targets.length} email jobs for campaign ${campaignId}`);
        await this.createEmailJobs(campaignId, campaign.targets);
        this.logger.log(`✅ [EMAIL_JOB_CREATED] Email jobs created successfully for campaign ${campaignId}`);
      
        // Use Bull queue if available, otherwise process synchronously
        if (this.useQueue && this.phishingQueueService) {
          this.logger.log(`📨 [QUEUE_PROCESS_START] Using Bull queue to process campaign ${campaignId}`);
          
          // Add campaign processing job to queue
          await this.phishingQueueService.addCampaignProcessingJob(
            campaignId,
            organizationId,
            'high' // High priority for immediate launches
          );
          this.logger.log(`📨 [QUEUE_PROCESS_ADDED] Campaign added to processing queue`);
        } else {
          this.logger.log(`📨 [SYNC_PROCESS_START] Using synchronous processing for campaign ${campaignId}`);
          
          // Process email jobs asynchronously (don't wait for completion)
          this.processEmailJobs(campaignId).catch(error => {
            this.logger.error(`❌ [SYNC_PROCESS_ERROR] Error processing email jobs for campaign ${campaignId}:`, error);
          });
          this.logger.log(`📨 [SYNC_PROCESS_STARTED] Email processing started asynchronously`);
        }
      } else {
        this.logger.log(`📅 [EMAIL_JOB_SKIP] Campaign ${campaignId} scheduled for ${scheduledAt.toISOString()} - email jobs will be created at runtime`);
      }

      // Create launch event
      await this.createCampaignEvent(campaignId, 
        isScheduled ? PhishingEventType.CAMPAIGN_STARTED : PhishingEventType.CAMPAIGN_STARTED,
        { 
          scheduledAt: scheduledAt.toISOString(),
          processingMode: this.useQueue ? 'queue' : 'sync'
        }
      );

      this.logger.log(`✅ Campaign ${campaignId} launched successfully. Status: ${updatedCampaign.status}`);
      return updatedCampaign;
      
    } catch (error) {
      this.logger.error(`❌ CRITICAL: Campaign ${campaignId} launch failed:`, {
        error: error.message,
        stack: error.stack,
        campaignId,
        organizationId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
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
   * Process email jobs and send phishing emails to targets
   */
  async processEmailJobs(campaignId: string) {
    const startTime = Date.now();
    this.logger.log(`📨 [${campaignId}] Starting email job processing...`);

    try {
      // Get campaign details
      const campaign = await this.prisma.phishingCampaign.findUnique({
        where: { id: campaignId },
        include: {
          targets: true,
          organization: true
        }
      });

      if (!campaign) {
        this.logger.error(`❌ [${campaignId}] Campaign not found in database`);
        throw new NotFoundException('Campaign not found');
      }

      this.logger.log(`✅ [${campaignId}] Campaign found: "${campaign.name}", Org: ${campaign.organization?.name || 'Unknown'}`);

      // Get pending email jobs and their targets
      const pendingJobs = await this.prisma.emailJob.findMany({
        where: {
          campaignId,
          status: JobStatus.PENDING
        }
      });

      this.logger.log(`📋 [${campaignId}] Found ${pendingJobs.length} pending email jobs to process`);

      // Process each job
      let successCount = 0;
      let failureCount = 0;

      for (const job of pendingJobs) {
        try {
          this.logger.log(`📧 [${campaignId}] Processing job ${job.id}...`);
          
          // Get target details
          const target = await this.prisma.phishingTarget.findUnique({
            where: { id: job.targetId }
          });

          if (!target) {
            this.logger.error(`❌ [${campaignId}] Target not found for job ${job.id}. Skipping...`);
            failureCount++;
            continue;
          }

          this.logger.log(`👤 [${campaignId}] Target: ${target.email} (${target.firstName} ${target.lastName})`);

          // Mark job as processing
          await this.prisma.emailJob.update({
            where: { id: job.id },
            data: { 
              status: JobStatus.PROCESSING,
              lastAttemptAt: new Date(),
              attempts: { increment: 1 }
            }
          });

          this.logger.log(`⏳ [${campaignId}] Job ${job.id} marked as PROCESSING (attempt ${job.attempts + 1})`);

        // Personalize email content
        const personalizedContent = this.personalizeEmailContent(
          campaign.template,
          target
        );

        const personalizedSubject = this.personalizeEmailContent(
          campaign.subject,
          target
        );

        // Generate tracking URL for this specific target
        const trackingUrl = this.generateTrackingUrl(
          campaign.landingPageUrl,
          campaign.id,
          target.id
        );

        // Insert tracking pixel and link into email
        const emailWithTracking = this.insertTrackingElements(
          personalizedContent,
          campaign.id,
          target.id,
          trackingUrl
        );

        // Send email using bulk transport for phishing campaigns with circuit breaker
        const result = await this.circuitBreaker.execute(
          'email-service',
          async () => {
            return await this.emailService.sendEmail({
              to: target.email,
              subject: personalizedSubject,
              htmlContent: emailWithTracking,
              category: 'Phishing Campaign',
              fromEmail: campaign.senderEmail,
              fromName: campaign.senderName
            });
          },
          // Fallback: mark job for retry instead of failing immediately
          async () => {
            this.logger.warn(`Circuit breaker fallback for ${target.email} - will retry later`);
            return { 
              success: false, 
              error: 'Circuit breaker open - email service temporarily unavailable',
              timestamp: new Date(),
              attempts: 0
            };
          }
        );

        if (result.success) {
          // Update job status to SENT
          await this.prisma.emailJob.update({
            where: { id: job.id },
            data: {
              status: JobStatus.SENT,
              lastAttemptAt: new Date()
            }
          });

          // Track email sent event
          await this.emailTrackingService.trackEmailEvent(
            campaignId,
            target.id,
            PhishingEventType.EMAIL_SENT,
            { messageId: result.messageId }
          );

          // Update campaign statistics
          await this.updateCampaignStatistics(campaignId, PhishingEventType.EMAIL_SENT);

          successCount++;
          this.logger.log(`✅ [${campaignId}] Email sent to ${target.email} (MessageID: ${result.messageId})`);
        } else {
          // Update job status to FAILED
          await this.prisma.emailJob.update({
            where: { id: job.id },
            data: {
              status: JobStatus.FAILED,
              errorMessage: result.error,
              lastAttemptAt: new Date()
            }
          });

          failureCount++;
          this.logger.error(`❌ [${campaignId}] Failed to send email to ${target.email}: ${result.error}`);
        }

        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        failureCount++;
        this.logger.error(`❌ [${campaignId}] EXCEPTION processing job ${job.id}:`, {
          error: error.message,
          stack: error.stack,
          jobId: job.id,
          targetId: job.targetId,
          timestamp: new Date().toISOString()
        });

        // Update job status to FAILED
        await this.prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.FAILED,
            errorMessage: error.message,
            lastAttemptAt: new Date()
          }
        });
      }
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      this.logger.log(`✅ [${campaignId}] Email job processing completed in ${duration}s`);
      this.logger.log(`📊 [${campaignId}] Summary: ${successCount} succeeded, ${failureCount} failed out of ${pendingJobs.length} total`);

      if (failureCount > 0) {
        const failureRate = ((failureCount / pendingJobs.length) * 100).toFixed(2);
        this.logger.warn(`⚠️ [${campaignId}] Failure rate: ${failureRate}%`);
      }

      // Check if all jobs are complete and update campaign status
      await this.checkAndUpdateCampaignCompletion(campaignId);
      
    } catch (error) {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      this.logger.error(`❌ [${campaignId}] CRITICAL ERROR in processEmailJobs after ${duration}s:`, {
        error: error.message,
        stack: error.stack,
        campaignId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Process a single email job
   * Used by Bull queue processor for individual email processing
   */
  async processSingleEmailJob(campaignId: string, targetId: string) {
    const startTime = Date.now();
    this.logger.log(`🎯 [Queue] Processing single job - Campaign: ${campaignId}, Target: ${targetId}`);

    try {
      // Get campaign details
      const campaign = await this.prisma.phishingCampaign.findUnique({
        where: { id: campaignId },
        include: {
          organization: true
        }
      });

      if (!campaign) {
        this.logger.error(`❌ [Queue] Campaign ${campaignId} not found`);
        throw new NotFoundException('Campaign not found');
      }

      // Get target details
      const target = await this.prisma.phishingTarget.findUnique({
        where: { id: targetId }
      });

      if (!target) {
        this.logger.error(`❌ [Queue] Target ${targetId} not found for campaign ${campaignId}`);
        throw new NotFoundException('Target not found');
      }

      this.logger.log(`✅ [Queue] Found target: ${target.email}`);

    // Get the email job
    const job = await this.prisma.emailJob.findFirst({
      where: {
        campaignId,
        targetId
      }
    });

    if (!job) {
      throw new NotFoundException('Email job not found');
    }

    // Check if already sent
    if (job.status === JobStatus.SENT) {
      this.logger.log(`Email job ${job.id} already sent, skipping`);
      return;
    }

    try {
      // Mark job as processing
      await this.prisma.emailJob.update({
        where: { id: job.id },
        data: { 
          status: JobStatus.PROCESSING,
          lastAttemptAt: new Date(),
          attempts: { increment: 1 }
        }
      });

      // Personalize email content
      const personalizedContent = this.personalizeEmailContent(
        campaign.template,
        target
      );

      const personalizedSubject = this.personalizeEmailContent(
        campaign.subject,
        target
      );

      // Generate tracking URL for this specific target
      const trackingUrl = this.generateTrackingUrl(
        campaign.landingPageUrl,
        campaign.id,
        target.id
      );

      // Insert tracking pixel and link into email
      const emailWithTracking = this.insertTrackingElements(
        personalizedContent,
        campaign.id,
        target.id,
        trackingUrl
      );

      // Send email using bulk transport for phishing campaigns with circuit breaker
      const result = await this.circuitBreaker.execute(
        'email-service',
        async () => {
          return await this.emailService.sendBulkEmail(
            personalizedSubject,
            emailWithTracking,
            [target.email],
            true, // isHtml
            'Phishing Campaign',
            campaign.senderEmail,
            campaign.senderName
          );
        },
        // Fallback: mark job for retry instead of failing immediately
        async () => {
          this.logger.warn(`Circuit breaker fallback for ${target.email} - will retry later`);
          return { 
            success: false, 
            error: 'Circuit breaker open - email service temporarily unavailable',
            timestamp: new Date(),
            attempts: 0
          };
        }
      );

      if (result.success) {
        // Update job status to SENT
        await this.prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.SENT,
            lastAttemptAt: new Date()
          }
        });

        // Track email sent event
        await this.emailTrackingService.trackEmailEvent(
          campaignId,
          target.id,
          PhishingEventType.EMAIL_SENT,
          { messageId: result.messageId }
        );

        // Update campaign statistics
        await this.updateCampaignStatistics(campaignId, PhishingEventType.EMAIL_SENT);

        const endTime = Date.now();
        const duration = endTime - startTime;
        this.logger.log(`✅ [Queue] Email sent to ${target.email} in ${duration}ms (MessageID: ${result.messageId})`);
      } else {
        // Update job status to FAILED
        await this.prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.FAILED,
            errorMessage: result.error,
            lastAttemptAt: new Date()
          }
        });

        this.logger.error(`❌ [Queue] Failed to send to ${target.email}: ${result.error}`);
        throw new Error(`Failed to send email: ${result.error}`);
      }
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.logger.error(`❌ [Queue] EXCEPTION processing job ${job.id} after ${duration}ms:`, {
        error: error.message,
        stack: error.stack,
        campaignId,
        targetId,
        jobId: job.id,
        targetEmail: target.email,
        timestamp: new Date().toISOString()
      });

      // Update job status to FAILED if not already updated
      await this.prisma.emailJob.updateMany({
        where: {
          id: job.id,
          status: { not: JobStatus.FAILED }
        },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error.message,
          lastAttemptAt: new Date()
        }
      });

      throw error; // Re-throw for Bull queue to handle retry
    }
    } catch (error) {
      this.logger.error(`❌ [Queue] CRITICAL ERROR in processSingleEmailJob:`, {
        error: error.message,
        stack: error.stack,
        campaignId,
        targetId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Personalize email content with target information
   */
  private personalizeEmailContent(content: string, target: any): string {
    let personalized = content;

    // Replace placeholders with target information
    const replacements = {
      '{{firstName}}': target.firstName || '',
      '{{lastName}}': target.lastName || '',
      '{{fullName}}': `${target.firstName || ''} ${target.lastName || ''}`.trim(),
      '{{email}}': target.email || '',
      '{{department}}': target.department || '',
      '{{jobTitle}}': target.jobTitle || '',
      '{{company}}': target.company || ''
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      personalized = personalized.replace(new RegExp(placeholder, 'g'), value);
    }

    return personalized;
  }

  /**
   * Generate tracking URL with campaign and target IDs
   */
  /** Landing page for a tracked click; falls back to the default page for unknown campaign/target pairs. */
  async getLandingRedirectUrl(campaignId: string, targetId: string): Promise<string> {
    const target = await this.prisma.phishingTarget.findFirst({
      where: { id: targetId, campaignId },
      select: { campaign: { select: { landingPageUrl: true } } },
    });

    return this.generateTrackingUrl(target?.campaign?.landingPageUrl, campaignId, targetId);
  }

  private generateTrackingUrl(baseUrl: string, campaignId: string, targetId: string): string {
    if (!baseUrl) {
      // Use default landing page URL with tracking params
      return `${process.env.APP_URL || 'http://localhost:3000'}/phishing/landing?c=${campaignId}&t=${targetId}`;
    }

    // Add tracking parameters to provided URL
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}c=${campaignId}&t=${targetId}`;
  }

  /**
   * Insert tracking pixel and convert links to tracking links
   */
  private insertTrackingElements(htmlContent: string, campaignId: string, targetId: string, trackingUrl: string): string {
    let content = htmlContent;

    // Replace landing page URL placeholders with tracking URL
    content = content.replace(/{{landingPageUrl}}/g, trackingUrl);
    content = content.replace(/{{trackingUrl}}/g, trackingUrl);

    // Insert tracking pixel at the end of the body
    const trackingPixelUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/defendx-plus/campaigns/track/open/${campaignId}/${targetId}`;
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`;

    // Insert before closing body tag, or append if no body tag
    if (content.includes('</body>')) {
      content = content.replace('</body>', `${trackingPixel}</body>`);
    } else {
      content += trackingPixel;
    }

    return content;
  }

  /**
   * Check if all email jobs are complete and update campaign status
   */
  private async checkAndUpdateCampaignCompletion(campaignId: string) {
    const pendingJobs = await this.prisma.emailJob.count({
      where: {
        campaignId,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] }
      }
    });

    if (pendingJobs === 0) {
      // All jobs complete, check if campaign should be marked complete
      const campaign = await this.prisma.phishingCampaign.findUnique({
        where: { id: campaignId }
      });

      if (campaign && campaign.status === CampaignStatus.RUNNING) {
        this.logger.log(`All emails sent for campaign ${campaignId}. Campaign remains in RUNNING state for tracking.`);
        // Note: We don't auto-complete the campaign here as we want to continue tracking
        // The admin can manually complete it when they're done tracking
      }
    }
  }

  /**
   * Scheduled Campaign Processing
   * Runs every minute to check for campaigns that need to be launched
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    try {
      const now = new Date();
      this.logger.debug(`⏰ [Cron] Checking for scheduled campaigns at ${now.toISOString()}`);
      
      // Find campaigns that are scheduled to launch now or in the past
      const scheduledCampaigns = await this.prisma.phishingCampaign.findMany({
        where: {
          status: CampaignStatus.SCHEDULED,
          scheduledAt: {
            lte: now
          }
        },
        include: {
          targets: true
        }
      });

      if (scheduledCampaigns.length === 0) {
        this.logger.debug(`⏰ [Cron] No scheduled campaigns ready to launch`);
        return;
      }

      this.logger.log(`🚀 [Cron] Found ${scheduledCampaigns.length} scheduled campaigns ready to launch`);

      for (const campaign of scheduledCampaigns) {
        try {
          this.logger.log(`🚀 [Cron] Launching scheduled campaign: ${campaign.id} - "${campaign.name}"`);
          this.logger.log(`📅 [Cron] Was scheduled for: ${campaign.scheduledAt?.toISOString()}`);

          // Update campaign status to RUNNING
          await this.prisma.phishingCampaign.update({
            where: { id: campaign.id },
            data: {
              status: CampaignStatus.RUNNING,
              launchedAt: new Date()
            }
          });

          this.logger.log(`✅ [Cron] Campaign ${campaign.id} status updated to RUNNING`);

          // Create email jobs
          this.logger.log(`📧 [Cron] Creating ${campaign.targets.length} email jobs for campaign ${campaign.id}`);
          await this.createEmailJobs(campaign.id, campaign.targets);

          // Use Bull queue if available, otherwise process synchronously
          if (this.useQueue && this.phishingQueueService) {
            this.logger.log(`🔄 [Cron] Using Bull queue to process scheduled campaign ${campaign.id}`);
            
            // Add campaign processing job to queue
            await this.phishingQueueService.addCampaignProcessingJob(
              campaign.id,
              campaign.organizationId,
              'normal' // Normal priority for scheduled campaigns
            );
          } else {
            this.logger.log(`⚡ [Cron] Using synchronous processing for campaign ${campaign.id}`);
            
            // Process email jobs asynchronously
            this.processEmailJobs(campaign.id).catch(error => {
              this.logger.error(`❌ [Cron] Error processing email jobs for scheduled campaign ${campaign.id}:`, {
                error: error.message,
                stack: error.stack,
                campaignId: campaign.id,
                timestamp: new Date().toISOString()
              });
            });
          }

          // Create launch event
          await this.createCampaignEvent(
            campaign.id,
            PhishingEventType.CAMPAIGN_STARTED,
            { 
              autoLaunched: true, 
              scheduledAt: campaign.scheduledAt,
              processingMode: this.useQueue ? 'queue' : 'sync'
            }
          );

          this.logger.log(`✅ [Cron] Successfully launched scheduled campaign: ${campaign.id} - "${campaign.name}"`);
        } catch (error) {
          this.logger.error(`❌ [Cron] Failed to launch scheduled campaign ${campaign.id}:`, {
            error: error.message,
            stack: error.stack,
            campaignId: campaign.id,
            campaignName: campaign.name,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      this.logger.error(`❌ [Cron] CRITICAL ERROR in processScheduledCampaigns:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Retry Failed Email Jobs
   * Runs every 5 minutes to retry failed jobs that haven't exceeded max attempts
   */
  @Cron('*/5 * * * *')
  async retryFailedEmailJobs() {
    try {
      this.logger.log('Checking for failed email jobs to retry...');
      
      const failedJobs = await this.prisma.emailJob.findMany({
        where: {
          status: JobStatus.FAILED,
          attempts: {
            lt: 3 // maxAttempts default value
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

      this.logger.log(`Found ${failedJobs.length} failed email jobs to retry`);

      // Group jobs by campaign
      const jobsByCampaign = failedJobs.reduce((acc, job) => {
        const campaignId = job.campaignId;
        if (!acc[campaignId]) {
          acc[campaignId] = [];
        }
        acc[campaignId].push(job);
        return acc;
      }, {} as Record<string, typeof failedJobs>);

      // Process each campaign's failed jobs
      for (const [campaignId, jobs] of Object.entries(jobsByCampaign)) {
        try {
          // Check if campaign is still running
          const campaign = await this.prisma.phishingCampaign.findUnique({
            where: { id: campaignId },
            select: { id: true, name: true, status: true }
          });

          if (!campaign) {
            this.logger.log(`Skipping retry - campaign ${campaignId} not found`);
            continue;
          }

          if (campaign.status !== CampaignStatus.RUNNING) {
            this.logger.log(`Skipping retry for campaign ${campaignId} - status: ${campaign.status}`);
            continue;
          }

          this.logger.log(`Retrying ${jobs.length} failed jobs for campaign ${campaignId} (${campaign.name})`);

          // Reset jobs to pending
          await this.prisma.emailJob.updateMany({
            where: {
              id: { in: jobs.map(j => j.id) }
            },
            data: {
              status: JobStatus.PENDING,
              errorMessage: null
            }
          });

          // Process the jobs (will be picked up by processEmailJobs)
          // We don't call processEmailJobs here to avoid blocking the cron job
          // Instead, we can trigger it asynchronously
          this.processEmailJobs(campaignId).catch(error => {
            this.logger.error(`Error processing retried jobs for campaign ${campaignId}:`, error);
          });

        } catch (error) {
          this.logger.error(`Failed to retry jobs for campaign ${campaignId}:`, error);
        }
      }

      this.logger.log(`Completed retry process for ${failedJobs.length} jobs`);
    } catch (error) {
      this.logger.error('Error in retryFailedEmailJobs:', error);
    }
  }

  /**
   * Clean Up Old Email Jobs
   * Runs daily at 2 AM to remove old completed and cancelled jobs
   */
  @Cron('0 2 * * *')
  async cleanupOldJobs() {
    try {
      this.logger.log('Starting cleanup of old email jobs...');
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Delete completed and cancelled jobs older than 30 days
      const result = await this.prisma.emailJob.deleteMany({
        where: {
          status: { in: [JobStatus.SENT, JobStatus.CANCELLED] },
          updatedAt: { lt: thirtyDaysAgo }
        }
      });

      this.logger.log(`✅ Cleaned up ${result.count} old email jobs (older than 30 days)`);

      // Also clean up old events (optional - keep last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const eventsResult = await this.prisma.phishingEvent.deleteMany({
        where: {
          timestamp: { lt: ninetyDaysAgo }
        }
      });

      this.logger.log(`✅ Cleaned up ${eventsResult.count} old phishing events (older than 90 days)`);

    } catch (error) {
      this.logger.error('❌ Error in cleanupOldJobs:', error);
    }
  }

  /**
   * Campaign Health Check
   * Runs every 15 minutes to monitor campaign health and fix issues
   */
  @Cron('*/15 * * * *')
  async campaignHealthCheck() {
    try {
      this.logger.log('Running campaign health check...');
      
      const runningCampaigns = await this.prisma.phishingCampaign.findMany({
        where: { status: CampaignStatus.RUNNING },
        select: {
          id: true,
          name: true,
          organizationId: true,
          launchedAt: true,
          targetCount: true,
          emailsSent: true
        }
      });

      if (runningCampaigns.length === 0) {
        this.logger.log('No running campaigns to check');
        return;
      }

      this.logger.log(`Checking health of ${runningCampaigns.length} running campaigns...`);

      for (const campaign of runningCampaigns) {
        try {
          // Check 1: Stuck jobs (processing for > 30 minutes)
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const stuckJobs = await this.prisma.emailJob.findMany({
            where: {
              campaignId: campaign.id,
              status: JobStatus.PROCESSING,
              lastAttemptAt: {
                lt: thirtyMinutesAgo
              }
            }
          });

          if (stuckJobs.length > 0) {
            this.logger.warn(
              `⚠️ Campaign ${campaign.id} (${campaign.name}) has ${stuckJobs.length} stuck jobs. Resetting...`
            );

            // Reset stuck jobs to pending
            await this.prisma.emailJob.updateMany({
              where: { id: { in: stuckJobs.map(j => j.id) } },
              data: { 
                status: JobStatus.PENDING,
                errorMessage: 'Reset from stuck state by health check'
              }
            });

            this.logger.log(`✅ Reset ${stuckJobs.length} stuck jobs for campaign ${campaign.id}`);
          }

          // Check 2: High failure rate
          const totalJobs = await this.prisma.emailJob.count({
            where: { campaignId: campaign.id }
          });

          const failedJobs = await this.prisma.emailJob.count({
            where: { 
              campaignId: campaign.id,
              status: JobStatus.FAILED,
              attempts: { gte: 3 } // Only count permanently failed jobs
            }
          });

          const failureRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

          if (failureRate > 50 && totalJobs > 10) {
            this.logger.error(
              `🚨 ALERT: Campaign ${campaign.id} (${campaign.name}) has high failure rate: ${failureRate.toFixed(2)}% (${failedJobs}/${totalJobs} jobs)`
            );
            
            // Create a critical event
            await this.createCampaignEvent(
              campaign.id,
              PhishingEventType.CAMPAIGN_PAUSED, // Using available event type
              {
                alert: 'High failure rate detected',
                failureRate: failureRate.toFixed(2),
                failedJobs,
                totalJobs,
                autoDetected: true
              }
            );
          }

          // Check 3: Campaign stuck without progress
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (campaign.launchedAt && campaign.launchedAt < oneHourAgo) {
            const pendingJobs = await this.prisma.emailJob.count({
              where: {
                campaignId: campaign.id,
                status: JobStatus.PENDING
              }
            });

            const processingJobs = await this.prisma.emailJob.count({
              where: {
                campaignId: campaign.id,
                status: JobStatus.PROCESSING
              }
            });

            // If campaign has been running for > 1 hour with no pending/processing jobs
            // but emails sent is less than target count, something might be wrong
            if (pendingJobs === 0 && processingJobs === 0 && campaign.emailsSent < campaign.targetCount) {
              this.logger.warn(
                `⚠️ Campaign ${campaign.id} (${campaign.name}) appears stuck. ` +
                `Sent: ${campaign.emailsSent}/${campaign.targetCount}, ` +
                `Pending: ${pendingJobs}, Processing: ${processingJobs}`
              );
              
              // Check if there are failed jobs that could be retried
              const retriableFailedJobs = await this.prisma.emailJob.count({
                where: {
                  campaignId: campaign.id,
                  status: JobStatus.FAILED,
                  attempts: { lt: 3 }
                }
              });

              if (retriableFailedJobs > 0) {
                this.logger.log(`Found ${retriableFailedJobs} retriable failed jobs. These will be retried by retryFailedEmailJobs cron.`);
              }
            }
          }

          // Check 4: Long-running campaigns (> 7 days)
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (campaign.launchedAt && campaign.launchedAt < sevenDaysAgo) {
            const pendingOrProcessing = await this.prisma.emailJob.count({
              where: {
                campaignId: campaign.id,
                status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] }
              }
            });

            if (pendingOrProcessing === 0) {
              this.logger.log(
                `📅 Campaign ${campaign.id} (${campaign.name}) has been running for > 7 days with all jobs complete. Consider completing it.`
              );
            }
          }

        } catch (error) {
          this.logger.error(`Error checking health of campaign ${campaign.id}:`, error);
        }
      }

      this.logger.log('✅ Campaign health check completed');

    } catch (error) {
      this.logger.error('❌ Error in campaignHealthCheck:', error);
    }
  }

  /**
   * Auto-Complete Stale Campaigns
   * Runs every 6 hours to auto-complete campaigns that have been running for > 7 days
   * with all emails sent
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
        },
        select: {
          id: true,
          name: true,
          organizationId: true,
          launchedAt: true
        }
      });

      if (staleCampaigns.length === 0) {
        this.logger.log('No stale campaigns found');
        return;
      }

      this.logger.log(`Found ${staleCampaigns.length} campaigns running for > 7 days`);

      for (const campaign of staleCampaigns) {
        try {
          // Check if all jobs are complete
          const pendingJobs = await this.prisma.emailJob.count({
            where: {
              campaignId: campaign.id,
              status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] }
            }
          });

          if (pendingJobs === 0) {
            this.logger.log(
              `Auto-completing stale campaign: ${campaign.id} (${campaign.name}) - ` +
              `Running since ${campaign.launchedAt?.toISOString()}`
            );

            await this.completeCampaign(campaign.organizationId, campaign.id);
            
            this.logger.log(`✅ Auto-completed campaign ${campaign.id}`);
          } else {
            this.logger.log(
              `Campaign ${campaign.id} still has ${pendingJobs} pending/processing jobs - not auto-completing`
            );
          }
        } catch (error) {
          this.logger.error(`Failed to auto-complete campaign ${campaign.id}:`, error);
        }
      }

      this.logger.log('✅ Stale campaign check completed');
    } catch (error) {
      this.logger.error('❌ Error in autoCompleteStaleCampaigns:', error);
    }
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