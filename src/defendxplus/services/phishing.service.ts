import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto, LaunchCampaignDto, UpdateCampaignDto } from '../dto/phishing.dto';

@Injectable()
export class PhishingService {
  constructor(private prisma: PrismaService) {}

  async createCampaign(userId: string, organizationId: string, createCampaignDto: CreateCampaignDto) {
    // Create the campaign
    const campaign = await this.prisma.phishingCampaign.create({
      data: {
        name: createCampaignDto.name,
        description: createCampaignDto.description,
        template: createCampaignDto.template,
        subject: createCampaignDto.subject,
        senderName: createCampaignDto.senderName,
        senderEmail: createCampaignDto.senderEmail,
        landingPageUrl: createCampaignDto.landingPageUrl,
        organizationId,
        status: 'DRAFT',
        scheduledAt: createCampaignDto.scheduledAt ? new Date(createCampaignDto.scheduledAt) : null,
        targetCount: createCampaignDto.targets.length,
      },
    });

    // Create targets
    await this.prisma.phishingTarget.createMany({
      data: createCampaignDto.targets.map(target => ({
        email: target.email,
        firstName: target.firstName,
        lastName: target.lastName,
        department: target.department,
        campaignId: campaign.id,
        status: 'PENDING',
      })),
    });

    return {
      message: 'Campaign created successfully',
      campaignId: campaign.id,
      data: {
        ...campaign,
        targetCount: createCampaignDto.targets.length,
      },
    };
  }

  async launchCampaign(userId: string, organizationId: string, launchCampaignDto: LaunchCampaignDto) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: {
        id: launchCampaignDto.campaignId,
        organizationId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'DRAFT') {
      throw new ForbiddenException('Campaign is not in draft status');
    }

    const isImmediate = launchCampaignDto.launchType === 'NOW' || !launchCampaignDto.launchType;
    
    const updatedCampaign = await this.prisma.phishingCampaign.update({
      where: { id: campaign.id },
      data: {
        status: isImmediate ? 'ACTIVE' : 'SCHEDULED',
        startedAt: isImmediate ? new Date() : undefined,
        scheduledAt: launchCampaignDto.scheduledAt ? new Date(launchCampaignDto.scheduledAt) : campaign.scheduledAt,
      },
    });

    // TODO: Implement actual email sending logic here
    // For now, we'll simulate the campaign launch
    if (isImmediate) {
      // Simulate email sending and update target statuses
      await this.simulateCampaignExecution(campaign.id);
    }

    return {
      message: 'Campaign launched successfully',
      data: updatedCampaign,
    };
  }

  private async simulateCampaignExecution(campaignId: string) {
    // This simulates the campaign execution for demo purposes
    // In a real implementation, this would integrate with an email service
    const targets = await this.prisma.phishingTarget.findMany({
      where: { campaignId },
    });

    // Simulate delivery success for most targets
    const deliveredTargets = targets.slice(0, Math.floor(targets.length * 0.9));
    
    for (const target of deliveredTargets) {
      await this.prisma.phishingTarget.update({
        where: { id: target.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });

      // Create delivery event
      await this.prisma.phishingEvent.create({
        data: {
          type: 'EMAIL_DELIVERED',
          campaignId,
          targetId: target.id,
          timestamp: new Date(),
        },
      });
    }

    // Update campaign statistics
    await this.prisma.phishingCampaign.update({
      where: { id: campaignId },
      data: {
        deliveredCount: deliveredTargets.length,
      },
    });
  }

  async getCampaignResults(userId: string, organizationId: string, campaignId: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: {
        id: campaignId,
        organizationId,
      },
      include: {
        targets: {
          orderBy: { createdAt: 'asc' },
        },
        events: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Calculate detailed analytics
    const totalTargets = campaign.targets.length;
    const deliveredTargets = campaign.targets.filter(t => ['DELIVERED', 'OPENED', 'CLICKED', 'REPORTED'].includes(t.status));
    const openedTargets = campaign.targets.filter(t => ['OPENED', 'CLICKED', 'REPORTED'].includes(t.status));
    const clickedTargets = campaign.targets.filter(t => ['CLICKED', 'REPORTED'].includes(t.status));
    const reportedTargets = campaign.targets.filter(t => t.status === 'REPORTED');

    // Department breakdown
    const departmentStats = campaign.targets.reduce((acc, target) => {
      const dept = target.department || 'Unknown';
      if (!acc[dept]) {
        acc[dept] = { total: 0, clicked: 0, reported: 0 };
      }
      acc[dept].total++;
      if (['CLICKED', 'REPORTED'].includes(target.status)) acc[dept].clicked++;
      if (target.status === 'REPORTED') acc[dept].reported++;
      return acc;
    }, {} as Record<string, { total: number; clicked: number; reported: number }>);

    // Repeat offenders (those who clicked in multiple campaigns)
    const repeatOffenders = await this.findRepeatOffenders(organizationId, campaign.targets.filter(t => t.status === 'CLICKED').map(t => t.email));

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      createdAt: campaign.createdAt,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
      analytics: {
        totalTargets,
        delivered: deliveredTargets.length,
        opened: openedTargets.length,
        clicked: clickedTargets.length,
        reported: reportedTargets.length,
        deliveryRate: totalTargets > 0 ? (deliveredTargets.length / totalTargets) * 100 : 0,
        openRate: deliveredTargets.length > 0 ? (openedTargets.length / deliveredTargets.length) * 100 : 0,
        clickRate: deliveredTargets.length > 0 ? (clickedTargets.length / deliveredTargets.length) * 100 : 0,
        reportRate: deliveredTargets.length > 0 ? (reportedTargets.length / deliveredTargets.length) * 100 : 0,
      },
      departmentBreakdown: Object.entries(departmentStats).map(([dept, stats]) => ({
        department: dept,
        total: stats.total,
        clicked: stats.clicked,
        reported: stats.reported,
        clickRate: stats.total > 0 ? (stats.clicked / stats.total) * 100 : 0,
        reportRate: stats.total > 0 ? (stats.reported / stats.total) * 100 : 0,
      })),
      repeatOffenders,
      targets: campaign.targets.map(target => ({
        id: target.id,
        email: target.email,
        name: `${target.firstName || ''} ${target.lastName || ''}`.trim(),
        department: target.department,
        status: target.status,
        deliveredAt: target.deliveredAt,
        openedAt: target.openedAt,
        clickedAt: target.clickedAt,
        reportedAt: target.reportedAt,
      })),
      timeline: campaign.events.map(event => ({
        type: event.type,
        timestamp: event.timestamp,
        metadata: event.metadata ? JSON.parse(event.metadata) : null,
      })),
    };
  }

  private async findRepeatOffenders(organizationId: string, clickedEmails: string[]) {
    if (clickedEmails.length === 0) return [];

    // Find users who have clicked in multiple campaigns
    const repeatOffenders = await this.prisma.phishingTarget.groupBy({
      by: ['email'],
      where: {
        email: { in: clickedEmails },
        campaign: { organizationId },
        status: 'CLICKED',
      },
      _count: { email: true },
      having: {
        email: { _count: { gt: 1 } },
      },
    });

    return repeatOffenders.map(offender => ({
      email: offender.email,
      clickCount: offender._count.email,
    }));
  }

  async getCampaigns(
    organizationId: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    
    const skip = (page - 1) * limit;
    const where: any = { organizationId };
    
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.phishingCampaign.findMany({
        where,
        include: {
          _count: {
            select: {
              targets: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.phishingCampaign.count({ where }),
    ]);

    return {
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateCampaign(
    userId: string,
    organizationId: string,
    campaignId: string,
    updateCampaignDto: UpdateCampaignDto,
  ) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: {
        id: campaignId,
        organizationId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === 'ACTIVE') {
      throw new ForbiddenException('Cannot update an active campaign');
    }

    const updatedCampaign = await this.prisma.phishingCampaign.update({
      where: { id: campaignId },
      data: {
        ...(updateCampaignDto.name && { name: updateCampaignDto.name }),
        ...(updateCampaignDto.description && { description: updateCampaignDto.description }),
        ...(updateCampaignDto.subject && { subject: updateCampaignDto.subject }),
        ...(updateCampaignDto.status && { status: updateCampaignDto.status as any }),
        updatedAt: new Date(),
      },
    });

    return {
      message: 'Campaign updated successfully',
      data: updatedCampaign,
    };
  }

  async deleteCampaign(userId: string, organizationId: string, campaignId: string) {
    const campaign = await this.prisma.phishingCampaign.findFirst({
      where: {
        id: campaignId,
        organizationId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === 'ACTIVE') {
      throw new ForbiddenException('Cannot delete an active campaign');
    }

    await this.prisma.phishingCampaign.delete({
      where: { id: campaignId },
    });

    return {
      message: 'Campaign deleted successfully',
    };
  }
}