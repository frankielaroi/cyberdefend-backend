import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Organization-wide phishing analytics
   */
  async getOrganizationAnalytics(organizationId: string, dateRange?: { startDate: Date; endDate: Date }) {
    const whereClause: any = { organizationId };
    
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      };
    }

    // Get all campaigns for the organization
    const campaigns = await this.prisma.phishingCampaign.findMany({
      where: whereClause,
      include: {
        targets: true,
        events: true
      }
    });

    // Calculate organization-wide metrics
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'RUNNING').length;
    const completedCampaigns = campaigns.filter(c => c.status === 'COMPLETED').length;
    
    const totalTargets = campaigns.reduce((sum, c) => sum + c.targetCount, 0);
    const totalEmailsSent = campaigns.reduce((sum, c) => sum + c.emailsSent, 0);
    const totalEmailsDelivered = campaigns.reduce((sum, c) => sum + c.emailsDelivered, 0);
    const totalEmailsOpened = campaigns.reduce((sum, c) => sum + c.emailsOpened, 0);
    const totalLinksClicked = campaigns.reduce((sum, c) => sum + c.linksClicked, 0);
    const totalCredentialsEntered = campaigns.reduce((sum, c) => sum + c.credentialsEntered, 0);
    const totalPhishingReported = campaigns.reduce((sum, c) => sum + c.phishingReported, 0);

    // Calculate rates
    const deliveryRate = totalEmailsSent > 0 ? (totalEmailsDelivered / totalEmailsSent) * 100 : 0;
    const openRate = totalEmailsDelivered > 0 ? (totalEmailsOpened / totalEmailsDelivered) * 100 : 0;
    const clickRate = totalEmailsDelivered > 0 ? (totalLinksClicked / totalEmailsDelivered) * 100 : 0;
    const credentialRate = totalEmailsDelivered > 0 ? (totalCredentialsEntered / totalEmailsDelivered) * 100 : 0;
    const reportRate = totalEmailsDelivered > 0 ? (totalPhishingReported / totalEmailsDelivered) * 100 : 0;
    const securityAwarenessScore = this.calculateSecurityAwarenessScore(reportRate, clickRate, credentialRate);

    // Department breakdown
    const departmentAnalytics = await this.getDepartmentAnalytics(organizationId, dateRange);

    // Time-series data for trends
    const trendData = await this.getCampaignTrends(organizationId, dateRange);

    // Risk assessment
    const riskAssessment = this.calculateOrganizationRisk({
      clickRate,
      credentialRate,
      reportRate,
      repeatOffenders: await this.getRepeatOffenders(organizationId)
    });

    return {
      organizationId,
      period: dateRange || { startDate: null, endDate: null },
      overview: {
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalTargets,
        totalEmailsSent,
        totalEmailsDelivered,
        totalEmailsOpened,
        totalLinksClicked,
        totalCredentialsEntered,
        totalPhishingReported
      },
      rates: {
        deliveryRate: parseFloat(deliveryRate.toFixed(2)),
        openRate: parseFloat(openRate.toFixed(2)),
        clickRate: parseFloat(clickRate.toFixed(2)),
        credentialRate: parseFloat(credentialRate.toFixed(2)),
        reportRate: parseFloat(reportRate.toFixed(2))
      },
      securityAwarenessScore: parseFloat(securityAwarenessScore.toFixed(2)),
      departmentAnalytics,
      trendData,
      riskAssessment,
      lastUpdated: new Date()
    };
  }

  /**
   * Department-specific analytics
   */
  async getDepartmentAnalytics(organizationId: string, dateRange?: { startDate: Date; endDate: Date }) {
    const whereClause: any = {
      campaign: { organizationId },
      department: { not: null }
    };

    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      };
    }

    // Group targets by department
    const departmentData = await this.prisma.phishingTarget.groupBy({
      by: ['department'],
      where: whereClause,
      _count: {
        _all: true
      }
    });

    const departmentAnalytics = await Promise.all(
      departmentData.map(async (dept) => {
        const targets = await this.prisma.phishingTarget.findMany({
          where: {
            ...whereClause,
            department: dept.department
          },
          include: {
            campaign: true
          }
        });

        const totalTargets = targets.length;
        const emailsOpened = targets.filter(t => t.emailOpened).length;
        const linksClicked = targets.filter(t => t.linkClicked).length;
        const credentialsEntered = targets.filter(t => t.credentialsEntered).length;
        const phishingReported = targets.filter(t => t.reportedPhishing).length;

        const avgRiskScore = targets
          .filter(t => t.riskScore !== null)
          .reduce((sum, t) => sum + (t.riskScore || 0), 0) / 
          targets.filter(t => t.riskScore !== null).length || 0;

        // Get repeat offenders in department
        const repeatOffenders = targets.filter(t => 
          t.credentialsEntered && 
          targets.filter(t2 => t2.email === t.email && t2.credentialsEntered).length > 1
        ).length;

        const openRate = totalTargets > 0 ? (emailsOpened / totalTargets) * 100 : 0;
        const clickRate = totalTargets > 0 ? (linksClicked / totalTargets) * 100 : 0;
        const credentialRate = totalTargets > 0 ? (credentialsEntered / totalTargets) * 100 : 0;
        const reportRate = totalTargets > 0 ? (phishingReported / totalTargets) * 100 : 0;

        return {
          department: dept.department || 'Unknown',
          totalTargets,
          emailsOpened,
          linksClicked,
          credentialsEntered,
          phishingReported,
          repeatOffenders,
          rates: {
            openRate: parseFloat(openRate.toFixed(2)),
            clickRate: parseFloat(clickRate.toFixed(2)),
            credentialRate: parseFloat(credentialRate.toFixed(2)),
            reportRate: parseFloat(reportRate.toFixed(2))
          },
          averageRiskScore: parseFloat(avgRiskScore.toFixed(2)),
          securityAwarenessScore: this.calculateSecurityAwarenessScore(reportRate, clickRate, credentialRate),
          riskTier: this.calculateRiskTier(clickRate, credentialRate, reportRate)
        };
      })
    );

    return departmentAnalytics.sort((a, b) => b.securityAwarenessScore - a.securityAwarenessScore);
  }

  /**
   * Individual user analytics
   */
  async getUserAnalytics(organizationId: string, userId?: string, email?: string) {
    const whereClause: any = {
      campaign: { organizationId }
    };

    if (userId) {
      whereClause.userId = userId;
    } else if (email) {
      whereClause.email = email;
    } else {
      throw new Error('Either userId or email must be provided');
    }

    const userTargets = await this.prisma.phishingTarget.findMany({
      where: whereClause,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true
          }
        },
        events: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (userTargets.length === 0) {
      return null;
    }

    const totalCampaigns = userTargets.length;
    const emailsOpened = userTargets.filter(t => t.emailOpened).length;
    const linksClicked = userTargets.filter(t => t.linkClicked).length;
    const credentialsEntered = userTargets.filter(t => t.credentialsEntered).length;
    const phishingReported = userTargets.filter(t => t.reportedPhishing).length;

    const openRate = totalCampaigns > 0 ? (emailsOpened / totalCampaigns) * 100 : 0;
    const clickRate = totalCampaigns > 0 ? (linksClicked / totalCampaigns) * 100 : 0;
    const credentialRate = totalCampaigns > 0 ? (credentialsEntered / totalCampaigns) * 100 : 0;
    const reportRate = totalCampaigns > 0 ? (phishingReported / totalCampaigns) * 100 : 0;

    const averageRiskScore = userTargets
      .filter(t => t.riskScore !== null)
      .reduce((sum, t) => sum + (t.riskScore || 0), 0) / 
      userTargets.filter(t => t.riskScore !== null).length || 0;

    // Calculate improvement trend
    const recentCampaigns = userTargets.slice(0, 5);
    const olderCampaigns = userTargets.slice(5, 10);
    
    const recentClickRate = recentCampaigns.length > 0 ? 
      (recentCampaigns.filter(t => t.linkClicked).length / recentCampaigns.length) * 100 : 0;
    const olderClickRate = olderCampaigns.length > 0 ? 
      (olderCampaigns.filter(t => t.linkClicked).length / olderCampaigns.length) * 100 : 0;
    
    const improvementTrend = olderClickRate > 0 ? 
      ((olderClickRate - recentClickRate) / olderClickRate) * 100 : 0;

    return {
      userId,
      email: userTargets[0].email,
      firstName: userTargets[0].firstName,
      lastName: userTargets[0].lastName,
      department: userTargets[0].department,
      totalCampaigns,
      rates: {
        openRate: parseFloat(openRate.toFixed(2)),
        clickRate: parseFloat(clickRate.toFixed(2)),
        credentialRate: parseFloat(credentialRate.toFixed(2)),
        reportRate: parseFloat(reportRate.toFixed(2))
      },
      averageRiskScore: parseFloat(averageRiskScore.toFixed(2)),
      securityAwarenessScore: this.calculateSecurityAwarenessScore(reportRate, clickRate, credentialRate),
      improvementTrend: parseFloat(improvementTrend.toFixed(2)),
      riskTier: this.calculateRiskTier(clickRate, credentialRate, reportRate),
      isRepeatOffender: credentialsEntered > 1,
      campaignHistory: userTargets.map(target => ({
        campaignId: target.campaign.id,
        campaignName: target.campaign.name,
        campaignStatus: target.campaign.status,
        targetedAt: target.createdAt,
        emailOpened: target.emailOpened,
        linkClicked: target.linkClicked,
        credentialsEntered: target.credentialsEntered,
        phishingReported: target.reportedPhishing,
        riskScore: target.riskScore,
        responseTime: target.clickedAt ? 
          Math.round((target.clickedAt.getTime() - target.sentAt?.getTime() || 0) / 1000 / 60) : null // minutes
      }))
    };
  }

  /**
   * Campaign comparison analytics
   */
  async compareCampaigns(organizationId: string, campaignIds: string[]) {
    const campaigns = await this.prisma.phishingCampaign.findMany({
      where: {
        id: { in: campaignIds },
        organizationId
      },
      include: {
        targets: true,
        events: true
      }
    });

    if (campaigns.length === 0) {
      throw new NotFoundException('No campaigns found');
    }

    const comparison = campaigns.map(campaign => {
      const totalTargets = campaign.targetCount;
      const emailsDelivered = campaign.emailsDelivered;
      const emailsOpened = campaign.emailsOpened;
      const linksClicked = campaign.linksClicked;
      const credentialsEntered = campaign.credentialsEntered;
      const phishingReported = campaign.phishingReported;

      const openRate = emailsDelivered > 0 ? (emailsOpened / emailsDelivered) * 100 : 0;
      const clickRate = emailsDelivered > 0 ? (linksClicked / emailsDelivered) * 100 : 0;
      const credentialRate = emailsDelivered > 0 ? (credentialsEntered / emailsDelivered) * 100 : 0;
      const reportRate = emailsDelivered > 0 ? (phishingReported / emailsDelivered) * 100 : 0;

      // Calculate average response time
      const clickedTargets = campaign.targets.filter(t => t.clickedAt && t.sentAt);
      const avgResponseTime = clickedTargets.length > 0 ?
        clickedTargets.reduce((sum, t) => sum + 
          (t.clickedAt!.getTime() - t.sentAt!.getTime()), 0) / clickedTargets.length / 1000 / 60 : 0; // minutes

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: campaign.status,
        createdAt: campaign.createdAt,
        completedAt: campaign.completedAt,
        metrics: {
          totalTargets,
          emailsDelivered,
          emailsOpened,
          linksClicked,
          credentialsEntered,
          phishingReported
        },
        rates: {
          openRate: parseFloat(openRate.toFixed(2)),
          clickRate: parseFloat(clickRate.toFixed(2)),
          credentialRate: parseFloat(credentialRate.toFixed(2)),
          reportRate: parseFloat(reportRate.toFixed(2))
        },
        averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
        securityAwarenessScore: this.calculateSecurityAwarenessScore(reportRate, clickRate, credentialRate),
        riskScore: this.calculateCampaignRiskScore({ clickRate, credentialRate, reportRate })
      };
    });

    // Calculate benchmarks
    const avgOpenRate = comparison.reduce((sum, c) => sum + c.rates.openRate, 0) / comparison.length;
    const avgClickRate = comparison.reduce((sum, c) => sum + c.rates.clickRate, 0) / comparison.length;
    const avgCredentialRate = comparison.reduce((sum, c) => sum + c.rates.credentialRate, 0) / comparison.length;
    const avgReportRate = comparison.reduce((sum, c) => sum + c.rates.reportRate, 0) / comparison.length;

    return {
      campaigns: comparison,
      benchmarks: {
        avgOpenRate: parseFloat(avgOpenRate.toFixed(2)),
        avgClickRate: parseFloat(avgClickRate.toFixed(2)),
        avgCredentialRate: parseFloat(avgCredentialRate.toFixed(2)),
        avgReportRate: parseFloat(avgReportRate.toFixed(2))
      },
      bestPerforming: {
        highestReportRate: comparison.sort((a, b) => b.rates.reportRate - a.rates.reportRate)[0],
        lowestClickRate: comparison.sort((a, b) => a.rates.clickRate - b.rates.clickRate)[0],
        fastestReporting: comparison.sort((a, b) => a.averageResponseTime - b.averageResponseTime)[0]
      }
    };
  }

  /**
   * Helper methods for calculations
   */

  private async getCampaignTrends(organizationId: string, dateRange?: { startDate: Date; endDate: Date }) {
    const campaigns = await this.prisma.phishingCampaign.findMany({
      where: {
        organizationId,
        ...(dateRange && {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        })
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by month for trend analysis
    const monthlyData = new Map();

    campaigns.forEach(campaign => {
      const monthKey = campaign.createdAt.toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          campaigns: 0,
          totalTargets: 0,
          totalClicks: 0,
          totalCredentials: 0,
          totalReports: 0
        });
      }

      const monthData = monthlyData.get(monthKey);
      monthData.campaigns++;
      monthData.totalTargets += campaign.targetCount;
      monthData.totalClicks += campaign.linksClicked;
      monthData.totalCredentials += campaign.credentialsEntered;
      monthData.totalReports += campaign.phishingReported;
    });

    return Array.from(monthlyData.values()).map(data => ({
      ...data,
      clickRate: data.totalTargets > 0 ? (data.totalClicks / data.totalTargets) * 100 : 0,
      credentialRate: data.totalTargets > 0 ? (data.totalCredentials / data.totalTargets) * 100 : 0,
      reportRate: data.totalTargets > 0 ? (data.totalReports / data.totalTargets) * 100 : 0
    }));
  }

  private async getRepeatOffenders(organizationId: string): Promise<any[]> {
    const repeatOffenders = await this.prisma.$queryRaw`
      SELECT email, COUNT(*) as offense_count
      FROM phishing_targets pt
      JOIN phishing_campaigns pc ON pt.campaign_id = pc.id
      WHERE pc.organization_id = ${organizationId}
        AND pt.credentials_entered = true
      GROUP BY email
      HAVING COUNT(*) > 1
      ORDER BY offense_count DESC
    ` as any[];

    return repeatOffenders || [];
  }

  private calculateSecurityAwarenessScore(reportRate: number, clickRate: number, credentialRate: number): number {
    // Higher report rate = better awareness
    // Lower click and credential rates = better awareness
    const reportScore = Math.min(reportRate * 2, 100); // Weight report rate heavily
    const clickPenalty = clickRate * 1.5;
    const credentialPenalty = credentialRate * 2; // Heaviest penalty

    let score = reportScore - clickPenalty - credentialPenalty;
    score = Math.max(0, Math.min(100, score)); // Clamp between 0-100

    return score;
  }

  private calculateOrganizationRisk(metrics: {
    clickRate: number;
    credentialRate: number;
    reportRate: number;
    repeatOffenders: any[];
  }) {
    const { clickRate, credentialRate, reportRate, repeatOffenders } = metrics;
    
    let riskScore = 0;
    
    // High click rate increases risk
    if (clickRate > 30) riskScore += 30;
    else if (clickRate > 20) riskScore += 20;
    else if (clickRate > 10) riskScore += 10;
    
    // High credential rate significantly increases risk
    if (credentialRate > 20) riskScore += 40;
    else if (credentialRate > 10) riskScore += 30;
    else if (credentialRate > 5) riskScore += 20;
    
    // Low report rate increases risk
    if (reportRate < 10) riskScore += 20;
    else if (reportRate < 20) riskScore += 10;
    
    // Repeat offenders increase risk
    riskScore += Math.min(repeatOffenders.length * 5, 20);
    
    // Normalize to 0-100 scale
    riskScore = Math.min(riskScore, 100);
    
    let riskLevel = 'LOW';
    if (riskScore > 70) riskLevel = 'VERY_HIGH';
    else if (riskScore > 50) riskLevel = 'HIGH';
    else if (riskScore > 30) riskLevel = 'MEDIUM';
    
    return {
      score: riskScore,
      level: riskLevel,
      factors: {
        clickRate,
        credentialRate,
        reportRate,
        repeatOffenderCount: repeatOffenders.length
      }
    };
  }

  private calculateRiskTier(clickRate: number, credentialRate: number, reportRate: number): string {
    if (credentialRate > 15 || (clickRate > 25 && reportRate < 15)) return 'VERY_HIGH';
    if (credentialRate > 8 || (clickRate > 15 && reportRate < 25)) return 'HIGH';
    if (credentialRate > 3 || (clickRate > 8 && reportRate < 40)) return 'MEDIUM';
    if (reportRate > 60 && clickRate < 5) return 'VERY_LOW';
    return 'LOW';
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
}