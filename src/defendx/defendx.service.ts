import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AssessmentService } from './services/assessment.service';
import { QuestionService } from './services/question.service';
import { BenchmarkService } from './services/benchmark.service';
import {
  CSIDirectoryQueryDto,
  LeaderboardQueryDto,
  SearchQueryDto,
  TrendsQueryDto,
  ExportQueryDto,
  CSIDirectoryResponseDto,
  HeatmapResponseDto,
  OrganizationProfileDto,
  FilterOptionsResponseDto,
  InsightsResponseDto,
  OrganizationDirectoryItemDto,
  CSITier,
  Sector,
  OrganizationSize
} from './dto/csi-directory.dto';

@Injectable()
export class DefendxService {
  constructor(
    private prisma: PrismaService,
    private assessmentService: AssessmentService,
    private questionService: QuestionService,
    private benchmarkService: BenchmarkService,
  ) {}

  async getPublicDirectory(
    region?: string,
    sector?: string,
    size?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const take = limit;
    
    const where: any = {
      isPublic: true,
      isActive: true,
      csiScore: { not: null },
    };

    if (region) where.region = region;
    if (sector) where.sector = sector;
    if (size) where.size = size;

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          sector: true,
          size: true,
          region: true,
          city: true,
          csiScore: true,
          riskTier: true,
          updatedAt: true,
        },
        orderBy: { csiScore: 'desc' },
        skip,
        take,
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getRegionalStats() {
    const stats = await this.prisma.organization.groupBy({
      by: ['region'],
      where: {
        isPublic: true,
        isActive: true,
        csiScore: { not: null },
      },
      _avg: {
        csiScore: true,
      },
      _count: {
        id: true,
      },
    });

    return stats.map(stat => ({
      region: stat.region,
      averageScore: stat._avg.csiScore,
      organizationCount: stat._count.id,
      riskLevel: this.calculateRiskLevel(stat._avg.csiScore || 0),
    }));
  }

  async getSectorStats() {
    const stats = await this.prisma.organization.groupBy({
      by: ['sector'],
      where: {
        isPublic: true,
        isActive: true,
        csiScore: { not: null },
      },
      _avg: {
        csiScore: true,
      },
      _count: {
        id: true,
      },
    });

    return stats.map(stat => ({
      sector: stat.sector,
      averageScore: stat._avg.csiScore,
      organizationCount: stat._count.id,
      riskLevel: this.calculateRiskLevel(stat._avg.csiScore || 0),
    }));
  }

  async getCSIHeatmap() {
    const regionalData = await this.prisma.organization.groupBy({
      by: ['region'],
      where: {
        isPublic: true,
        isActive: true,
        csiScore: { not: null },
      },
      _avg: {
        csiScore: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      data: regionalData.map(data => ({
        region: data.region,
        averageScore: Math.round((data._avg.csiScore || 0) * 100) / 100,
        organizationCount: data._count.id,
        riskLevel: this.calculateRiskLevel(data._avg.csiScore || 0),
        color: this.getHeatmapColor(data._avg.csiScore || 0),
      })),
      metadata: {
        generatedAt: new Date(),
        totalRegions: regionalData.length,
        nationalAverage: await this.calculateNationalAverage(),
      },
    };
  }

  async getCSIAdminStats() {
    const [
      totalOrganizations,
      publicOrganizations,
      assessmentsThisMonth,
      averageNationalScore,
      sectorBreakdown,
      regionBreakdown,
      riskTierDistribution,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.organization.count({ where: { isActive: true, isPublic: true } }),
      this.prisma.assessment.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.calculateNationalAverage(),
      this.prisma.organization.groupBy({
        by: ['sector'],
        where: { isActive: true, csiScore: { not: null } },
        _avg: { csiScore: true },
        _count: { id: true },
      }),
      this.prisma.organization.groupBy({
        by: ['region'],
        where: { isActive: true, csiScore: { not: null } },
        _avg: { csiScore: true },
        _count: { id: true },
      }),
      this.prisma.organization.groupBy({
        by: ['riskTier'],
        where: { isActive: true, riskTier: { not: null } },
        _count: { id: true },
      }),
    ]);

    return {
      overview: {
        totalOrganizations,
        publicOrganizations,
        assessmentsThisMonth,
        averageNationalScore: Math.round(averageNationalScore * 100) / 100,
        publicParticipationRate: Math.round((publicOrganizations / totalOrganizations) * 100),
      },
      sectorBreakdown: sectorBreakdown.map(s => ({
        sector: s.sector,
        averageScore: Math.round((s._avg.csiScore || 0) * 100) / 100,
        organizationCount: s._count.id,
      })),
      regionBreakdown: regionBreakdown.map(r => ({
        region: r.region,
        averageScore: Math.round((r._avg.csiScore || 0) * 100) / 100,
        organizationCount: r._count.id,
      })),
      riskTierDistribution: riskTierDistribution.map(rt => ({
        riskTier: rt.riskTier,
        count: rt._count.id,
      })),
      generatedAt: new Date(),
    };
  }

  private async calculateNationalAverage(): Promise<number> {
    const result = await this.prisma.organization.aggregate({
      where: {
        isActive: true,
        csiScore: { not: null },
      },
      _avg: {
        csiScore: true,
      },
    });
    
    return result._avg.csiScore || 0;
  }

  private async calculateSectorAverages(): Promise<Record<string, number>> {
    const sectorStats = await this.prisma.organization.groupBy({
      by: ['sector'],
      where: {
        isActive: true,
        isPublic: true,
        csiScore: { not: null },
      },
      _avg: {
        csiScore: true,
      },
    });

    const averages: Record<string, number> = {};
    sectorStats.forEach(stat => {
      averages[stat.sector] = Math.round((stat._avg.csiScore || 0) * 10) / 10;
    });

    return averages;
  }

  private async calculateRegionalAverages(): Promise<Record<string, number>> {
    const regionalStats = await this.prisma.organization.groupBy({
      by: ['region'],
      where: {
        isActive: true,
        isPublic: true,
        csiScore: { not: null },
        region: { not: null },
      },
      _avg: {
        csiScore: true,
      },
    });

    const averages: Record<string, number> = {};
    regionalStats.forEach(stat => {
      if (stat.region) {
        averages[stat.region] = Math.round((stat._avg.csiScore || 0) * 10) / 10;
      }
    });

    return averages;
  }

  private async calculateSizeAverages(): Promise<Record<string, number>> {
    const sizeStats = await this.prisma.organization.groupBy({
      by: ['size'],
      where: {
        isActive: true,
        isPublic: true,
        csiScore: { not: null },
      },
      _avg: {
        csiScore: true,
      },
    });

    const averages: Record<string, number> = {};
    sizeStats.forEach(stat => {
      averages[stat.size] = Math.round((stat._avg.csiScore || 0) * 10) / 10;
    });

    return averages;
  }

  private async calculateRiskDistribution(): Promise<{ lowRisk: number; mediumRisk: number; highRisk: number }> {
    const organizations = await this.prisma.organization.findMany({
      where: {
        isActive: true,
        isPublic: true,
        csiScore: { not: null },
      },
      select: { csiScore: true },
    });

    let lowRisk = 0;
    let mediumRisk = 0;
    let highRisk = 0;

    organizations.forEach(org => {
      const score = org.csiScore || 0;
      if (score >= 80) {
        lowRisk++;
      } else if (score >= 60) {
        mediumRisk++;
      } else {
        highRisk++;
      }
    });

    return { lowRisk, mediumRisk, highRisk };
  }

  private getHeatmapColor(score: number): string {
    if (score >= 81) return '#22c55e'; // Green - Very Low Risk
    if (score >= 61) return '#84cc16'; // Light Green - Low Risk  
    if (score >= 41) return '#eab308'; // Yellow - Medium Risk
    if (score >= 21) return '#f97316'; // Orange - High Risk
    return '#ef4444'; // Red - Very High Risk
  }

  // Enhanced CSI Directory Methods

  async getCSIDirectory(query: CSIDirectoryQueryDto): Promise<CSIDirectoryResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      isPublic: true,
      isActive: true,
      csiScore: { not: null },
    };

    // Apply filters
    if (query.sector) where.sector = query.sector;
    if (query.region) where.region = { contains: query.region, mode: 'insensitive' };
    if (query.size) where.size = query.size;
    if (query.minScore !== undefined || query.maxScore !== undefined) {
      where.csiScore = {};
      if (query.minScore !== undefined) where.csiScore.gte = query.minScore;
      if (query.maxScore !== undefined) where.csiScore.lte = query.maxScore;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    // Map tier to score range
    if (query.tier) {
      const tierRanges = {
        'A': { gte: 90 },
        'B': { gte: 80, lt: 90 },
        'C': { gte: 70, lt: 80 },
        'D': { gte: 60, lt: 70 },
        'F': { lt: 60 }
      };
      where.csiScore = { ...where.csiScore, ...tierRanges[query.tier] };
    }

    // Set up ordering
    const orderBy: any = {};
    switch (query.sortBy) {
      case 'score':
        orderBy.csiScore = query.sortOrder;
        break;
      case 'name':
        orderBy.name = query.sortOrder;
        break;
      case 'lastAssessmentDate':
        orderBy.updatedAt = query.sortOrder;
        break;
      default:
        orderBy.csiScore = 'desc';
    }

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          sector: true,
          size: true,
          region: true,
          csiScore: true,
          updatedAt: true,
          assessments: {
            where: { status: 'COMPLETED' },
            orderBy: { completedAt: 'desc' },
            take: 1,
            select: { completedAt: true }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);

    const data: OrganizationDirectoryItemDto[] = organizations.map((org, index) => ({
      organizationId: org.id,
      name: org.name,
      score: org.csiScore || 0,
      tier: this.scoreToTier(org.csiScore || 0),
      sector: org.sector as Sector,
      region: org.region || '',
      size: org.size as OrganizationSize,
      lastAssessmentDate: org.assessments[0]?.completedAt || org.updatedAt,
      rank: skip + index + 1,
      previousRank: skip + index + 1, // TODO: Calculate from historical data
      rankChange: 0
    }));

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getCSILeaderboard(query: LeaderboardQueryDto): Promise<CSIDirectoryResponseDto> {
    const where: any = {
      isPublic: true,
      isActive: true,
      csiScore: { not: null },
    };

    if (query.sector) where.sector = query.sector;
    if (query.region) where.region = { contains: query.region, mode: 'insensitive' };
    if (query.size) where.size = query.size;

    const organizations = await this.prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        sector: true,
        size: true,
        region: true,
        csiScore: true,
        updatedAt: true,
        assessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { completedAt: true }
        }
      },
      orderBy: { csiScore: 'desc' },
      take: query.limit || 10,
    });

    const data: OrganizationDirectoryItemDto[] = organizations.map((org, index) => ({
      organizationId: org.id,
      name: org.name,
      score: org.csiScore || 0,
      tier: this.scoreToTier(org.csiScore || 0),
      sector: org.sector as Sector,
      region: org.region || '',
      size: org.size as OrganizationSize,
      lastAssessmentDate: org.assessments[0]?.completedAt || org.updatedAt,
      rank: index + 1,
      previousRank: index + 1,
      rankChange: 0
    }));

    return {
      success: true,
      data,
      pagination: {
        page: 1,
        limit: query.limit || 10,
        total: data.length,
        totalPages: 1
      }
    };
  }

  async getCSIHeatmapData(): Promise<HeatmapResponseDto> {
    const regionalData = await this.prisma.organization.groupBy({
      by: ['region'],
      where: {
        isPublic: true,
        isActive: true,
        csiScore: { not: null },
        region: { not: null }
      },
      _avg: {
        csiScore: true,
      },
      _count: {
        _all: true,
      },
    });

    // Calculate tier distributions by region
    const regions = await Promise.all(
      regionalData.map(async (region) => {
        const tierCounts = await this.prisma.organization.groupBy({
          by: ['csiScore'],
          where: {
            isPublic: true,
            isActive: true,
            region: region.region,
            csiScore: { not: null }
          },
          _count: { _all: true }
        });

        const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        tierCounts.forEach(item => {
          const tier = this.scoreToTier(item.csiScore || 0);
          distribution[tier] += item._count._all;
        });

        // Mock coordinates for Ghana regions
        const coordinates = this.getRegionCoordinates(region.region || '');

        return {
          name: region.region || '',
          code: region.region?.substring(0, 3).toUpperCase() || '',
          averageScore: region._avg.csiScore || 0,
          organizationCount: region._count._all,
          coordinates,
          distribution
        };
      })
    );

    const nationalStats = await this.prisma.organization.aggregate({
      where: {
        isPublic: true,
        isActive: true,
        csiScore: { not: null }
      },
      _avg: {
        csiScore: true,
      },
      _count: {
        _all: true,
      }
    });

    return {
      regions: regions.map(r => ({
        region: r.name,
        averageScore: r.averageScore,
        assessmentCount: r.organizationCount
      })),
      lastUpdated: new Date(),
      national: {
        averageScore: nationalStats._avg.csiScore || 0,
        totalOrganizations: nationalStats._count._all
      }
    };
  }

  async getOrganizationProfile(organizationId: string): Promise<OrganizationProfileDto> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        assessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          include: {
            responses: {
              include: {
                question: {
                  include: {
                    category: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get historical scores
    const historicalScores = organization.assessments.map(assessment => ({
      date: assessment.completedAt || assessment.createdAt,
      score: assessment.score || 0,
      tier: this.scoreToTier(assessment.score || 0)
    }));

    // Calculate benchmarks
    const benchmarks = await this.calculateBenchmarks(organization);

    // Calculate actual category breakdown from latest assessment
    const categoryBreakdown = {
      governance: 0,
      riskManagement: 0,
      assetManagement: 0,
      accessControl: 0,
      dataProtection: 0
    };
    
    if (organization.assessments.length > 0) {
      const latestAssessment = organization.assessments[0];
      const categoryScores: Record<string, { total: number; max: number }> = {};
      
      latestAssessment.responses.forEach(response => {
        const categoryName = response.question.category.name;
        if (!categoryScores[categoryName]) {
          categoryScores[categoryName] = { total: 0, max: 0 };
        }
        categoryScores[categoryName].total += response.score || 0;
        categoryScores[categoryName].max += response.question.weight || 1;
      });

      // Map categories to DTO structure
      Object.entries(categoryScores).forEach(([category, scores]) => {
        const percentage = scores.max > 0 ? Math.round((scores.total / scores.max) * 100) : 0;
        
        // Map category names to DTO properties
        switch (category.toLowerCase()) {
          case 'governance & policy':
          case 'governance':
            categoryBreakdown.governance = percentage;
            break;
          case 'risk management':
          case 'risk & compliance':
            categoryBreakdown.riskManagement = percentage;
            break;
          case 'asset management':
          case 'asset & inventory':
            categoryBreakdown.assetManagement = percentage;
            break;
          case 'access & authentication':
          case 'access control':
            categoryBreakdown.accessControl = percentage;
            break;
          case 'data protection':
          case 'data & privacy':
            categoryBreakdown.dataProtection = percentage;
            break;
        }
      });
    }

    return {
      organizationId: organization.id,
      name: organization.name,
      score: organization.csiScore || 0,
      tier: this.scoreToTier(organization.csiScore || 0),
      sector: organization.sector as Sector,
      region: organization.region || '',
      size: organization.size as OrganizationSize,
      lastAssessmentDate: organization.assessments[0]?.completedAt || organization.updatedAt,
      historicalScores,
      benchmarks,
      categoryBreakdown
    };
  }

  async searchCSIDirectory(query: SearchQueryDto): Promise<CSIDirectoryResponseDto> {
    const organizations = await this.prisma.organization.findMany({
      where: {
        isPublic: true,
        isActive: true,
        csiScore: { not: null },
        name: { contains: query.q, mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true,
        sector: true,
        size: true,
        region: true,
        csiScore: true,
        updatedAt: true,
        assessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { completedAt: true }
        }
      },
      orderBy: { csiScore: 'desc' },
      take: query.limit || 20,
    });

    const data: OrganizationDirectoryItemDto[] = organizations.map((org, index) => ({
      organizationId: org.id,
      name: org.name,
      score: org.csiScore || 0,
      tier: this.scoreToTier(org.csiScore || 0),
      sector: org.sector as Sector,
      region: org.region || '',
      size: org.size as OrganizationSize,
      lastAssessmentDate: org.assessments[0]?.completedAt || org.updatedAt,
      rank: index + 1,
      previousRank: index + 1,
      rankChange: 0
    }));

    return {
      success: true,
      data,
      pagination: {
        page: 1,
        limit: query.limit || 20,
        total: data.length,
        totalPages: 1
      }
    };
  }

  async getCSITrends(query: TrendsQueryDto) {
    const timeframe = query.timeframe || 'monthly';
    const daysBack = timeframe === 'yearly' ? 365 : timeframe === 'monthly' ? 30 : 7;
    
    // Get organizations with completed assessments in the specified timeframe
    const where: any = {
      isActive: true,
      isPublic: true,
      csiScore: { not: null },
    };

    if (query.sector) where.sector = query.sector;
    if (query.region) where.region = { contains: query.region, mode: 'insensitive' };

    // Get current scores
    const currentOrgs = await this.prisma.organization.findMany({
      where,
      select: { id: true, csiScore: true, updatedAt: true },
    });

    // Get assessments from the specified period for trend calculation
    const recentAssessments = await this.prisma.assessment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        },
        organization: where
      },
      select: {
        score: true,
        completedAt: true,
        organizationId: true
      },
      orderBy: { completedAt: 'desc' }
    });

    // Calculate trend data
    const currentAverage = currentOrgs.reduce((sum, org) => sum + (org.csiScore || 0), 0) / currentOrgs.length;
    const pastAverage = recentAssessments.reduce((sum, assessment) => sum + (assessment.score || 0), 0) / recentAssessments.length;
    const averageScoreChange = currentAverage - pastAverage;

    // Determine overall trend
    let overallTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (averageScoreChange > 1) overallTrend = 'improving';
    else if (averageScoreChange < -1) overallTrend = 'declining';

    // Group assessments by time period for trend data
    const trendData = this.groupAssessmentsByPeriod(recentAssessments, timeframe);

    return {
      success: true,
      data: {
        overallTrend,
        averageScoreChange: Math.round(averageScoreChange * 10) / 10,
        timeframe,
        filters: {
          sector: query.sector,
          region: query.region
        },
        trendData,
        stats: {
          totalOrganizations: currentOrgs.length,
          totalAssessments: recentAssessments.length,
          currentAverage: Math.round(currentAverage * 10) / 10,
          pastAverage: Math.round(pastAverage * 10) / 10
        }
      }
    };
  }

  private groupAssessmentsByPeriod(assessments: any[], timeframe: string) {
    const grouped: Record<string, { date: string; averageScore: number; count: number }> = {};
    
    assessments.forEach(assessment => {
      let dateKey: string;
      const date = new Date(assessment.completedAt);
      
      if (timeframe === 'yearly') {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (timeframe === 'monthly') {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else {
        dateKey = date.toISOString().split('T')[0]; // daily
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, averageScore: 0, count: 0 };
      }
      
      grouped[dateKey].averageScore += assessment.score || 0;
      grouped[dateKey].count += 1;
    });

    // Calculate averages
    Object.values(grouped).forEach(group => {
      group.averageScore = Math.round((group.averageScore / group.count) * 10) / 10;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCSIFilterOptions(): Promise<FilterOptionsResponseDto> {
    const [sectorCounts, regionCounts, sizeCounts, scoreDistribution] = await Promise.all([
      this.prisma.organization.groupBy({
        by: ['sector'],
        where: { isPublic: true, isActive: true, csiScore: { not: null } },
        _count: { _all: true }
      }),
      this.prisma.organization.groupBy({
        by: ['region'],
        where: { isPublic: true, isActive: true, csiScore: { not: null }, region: { not: null } },
        _count: { _all: true }
      }),
      this.prisma.organization.groupBy({
        by: ['size'],
        where: { isPublic: true, isActive: true, csiScore: { not: null } },
        _count: { _all: true }
      }),
      this.prisma.organization.findMany({
        where: { isPublic: true, isActive: true, csiScore: { not: null } },
        select: { csiScore: true }
      })
    ]);

    const sectors = sectorCounts.map(item => ({
      value: item.sector,
      label: this.getSectorLabel(item.sector),
      count: item._count._all
    }));

    const regions = regionCounts.map(item => ({
      value: item.region || '',
      label: item.region || '',
      count: item._count._all
    }));

    const sizes = sizeCounts.map(item => ({
      value: item.size,
      label: this.getSizeLabel(item.size),
      count: item._count._all
    }));

    // Calculate actual score ranges from real data
    const scoreRanges = [
      { min: 90, max: 100, label: 'Excellent (90-100)', count: 0 },
      { min: 80, max: 89, label: 'Very Good (80-89)', count: 0 },
      { min: 70, max: 79, label: 'Good (70-79)', count: 0 },
      { min: 60, max: 69, label: 'Fair (60-69)', count: 0 },
      { min: 0, max: 59, label: 'Poor (0-59)', count: 0 }
    ];

    const tiers = [
      { value: 'A', label: 'Tier A (90-100)', count: 0 },
      { value: 'B', label: 'Tier B (80-89)', count: 0 },
      { value: 'C', label: 'Tier C (70-79)', count: 0 },
      { value: 'D', label: 'Tier D (60-69)', count: 0 },
      { value: 'F', label: 'Tier F (0-59)', count: 0 }
    ];

    // Count organizations in each score range and tier
    scoreDistribution.forEach(org => {
      const score = org.csiScore || 0;
      
      // Count for score ranges
      if (score >= 90) scoreRanges[0].count++;
      else if (score >= 80) scoreRanges[1].count++;
      else if (score >= 70) scoreRanges[2].count++;
      else if (score >= 60) scoreRanges[3].count++;
      else scoreRanges[4].count++;

      // Count for tiers
      const tier = this.scoreToTier(score);
      const tierIndex = ['A', 'B', 'C', 'D', 'F'].indexOf(tier);
      if (tierIndex >= 0) tiers[tierIndex].count++;
    });

    return {
      success: true,
      data: {
        sectors,
        regions,
        sizes,
        scoreRanges,
        tiers
      }
    };
  }

  async exportCSIData(query: ExportQueryDto) {
    try {
      const whereClause = {
        isActive: true,
        isPublic: true,
        csiScore: { not: null },
        ...(query.sector && { sector: query.sector }),
        ...(query.region && { region: query.region }),
        ...(query.size && { size: query.size }),
        ...(query.tier && { 
          // For tier filtering, we'll need to calculate it from score
          // This is a simplified approach - you might want to store tier in the database
          ...(query.tier === CSITier.A && { csiScore: { gte: 4.5 } }),
          ...(query.tier === CSITier.B && { csiScore: { gte: 3.5, lt: 4.5 } }),
          ...(query.tier === CSITier.C && { csiScore: { gte: 2.5, lt: 3.5 } }),
          ...(query.tier === CSITier.D && { csiScore: { gte: 1.5, lt: 2.5 } }),
          ...(query.tier === CSITier.F && { csiScore: { gte: 0, lt: 1.5 } })
        }),
        ...(query.minScore && { csiScore: { gte: query.minScore } }),
        ...(query.maxScore && { csiScore: { lte: query.maxScore } })
      };

      const organizations = await this.prisma.organization.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          sector: true,
          region: true,
          size: true,
          csiScore: true,
          updatedAt: true,
          assessments: {
            take: 1,
            orderBy: { completedAt: 'desc' },
            select: {
              completedAt: true,
              result: {
                select: {
                  overallScore: true,
                  categoryScores: true,
                  tier: true,
                  generatedAt: true
                }
              }
            }
          }
        },
        orderBy: { csiScore: 'desc' }
      });

      // For now, return metadata about the export
      // In a real implementation, you would generate the actual file
      return {
        success: true,
        message: `Export in ${query.format} format initiated`,
        downloadUrl: `/api/downloads/csi-export-${Date.now()}.${query.format}`,
        totalRecords: organizations.length,
        filters: query
      };
    } catch (error) {
      return {
        success: false,
        message: 'Export failed',
        error: error.message
      };
    }
  }

  async getCSIInsights(): Promise<InsightsResponseDto> {
    // Get top performers
    const topOverall = await this.getCSILeaderboard({ limit: 5 });
    
    // Get top performers by sector
    const topBySector = await Promise.all([
      this.getCSILeaderboard({ sector: Sector.BANKING, limit: 3 }),
      this.getCSILeaderboard({ sector: Sector.TELECOMMUNICATIONS, limit: 3 }),
      this.getCSILeaderboard({ sector: Sector.GOVERNMENT, limit: 3 })
    ]);

    // Get top performers by region
    const topByRegion = await Promise.all([
      this.getCSILeaderboard({ region: 'Greater Accra', limit: 3 }),
      this.getCSILeaderboard({ region: 'Ashanti', limit: 3 }),
      this.getCSILeaderboard({ region: 'Western', limit: 3 })
    ]);

    // Calculate actual benchmarks from database
    const [nationalAvg, sectorAvgs, regionalAvgs, sizeAvgs, riskDistribution] = await Promise.all([
      this.calculateNationalAverage(),
      this.calculateSectorAverages(),
      this.calculateRegionalAverages(),
      this.calculateSizeAverages(),
      this.calculateRiskDistribution()
    ]);

    // Get trending organizations (simplified - organizations with recent improvements)
    const recentAssessments = await this.prisma.assessment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            sector: true,
            size: true,
            region: true,
            csiScore: true
          }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: 10
    });

    const improving = recentAssessments
      .filter(assessment => (assessment.score || 0) > 75)
      .map(assessment => ({
        organizationId: assessment.organization.id,
        name: assessment.organization.name,
        score: assessment.organization.csiScore || 0,
        tier: this.scoreToTier(assessment.organization.csiScore || 0),
        sector: assessment.organization.sector as Sector,
        region: assessment.organization.region || '',
        size: assessment.organization.size as OrganizationSize,
        lastAssessmentDate: assessment.completedAt || assessment.createdAt,
        rank: 1,
        previousRank: 1,
        rankChange: 0
      }))
      .slice(0, 5);

    return {
      success: true,
      data: {
        topPerformers: {
          bySector: topBySector.flatMap(result => result.data).slice(0, 3),
          byRegion: topByRegion.flatMap(result => result.data).slice(0, 3),
          overall: topOverall.data
        },
        trends: {
          improving,
          declining: [] // Could implement similar logic for declining organizations
        },
        benchmarks: {
          nationalAverage: nationalAvg,
          sectorAverages: sectorAvgs,
          regionalAverages: regionalAvgs,
          sizeAverages: sizeAvgs
        },
        riskDistribution
      }
    };
  }

  // Helper methods
  private scoreToTier(score: number): CSITier {
    if (score >= 90) return CSITier.A;
    if (score >= 80) return CSITier.B;
    if (score >= 70) return CSITier.C;
    if (score >= 60) return CSITier.D;
    return CSITier.F;
  }

  private getRegionCoordinates(region: string): { lat: number; lng: number } {
    const coordinates: Record<string, { lat: number; lng: number }> = {
      'Greater Accra': { lat: 5.6037, lng: -0.1870 },
      'Ashanti': { lat: 6.6885, lng: -1.6244 },
      'Western': { lat: 5.2745, lng: -2.0581 },
      'Central': { lat: 5.3364, lng: -1.0677 },
      'Eastern': { lat: 6.1083, lng: -0.2833 },
      'Volta': { lat: 6.8667, lng: 0.4500 },
      'Northern': { lat: 9.4034, lng: -0.8424 },
      'Upper East': { lat: 10.7969, lng: -0.8567 },
      'Upper West': { lat: 10.3781, lng: -2.7079 },
      'Brong Ahafo': { lat: 7.7155, lng: -2.3200 }
    };
    return coordinates[region] || { lat: 7.9465, lng: -1.0232 }; // Default to Ghana center
  }

  private getSectorLabel(sector: string): string {
    const labels: Record<string, string> = {
      'BANKING': 'Banking & Finance',
      'TELECOMMUNICATIONS': 'Telecommunications',
      'INSURANCE': 'Insurance',
      'GOVERNMENT': 'Government',
      'HEALTHCARE': 'Healthcare',
      'EDUCATION': 'Education',
      'ENERGY': 'Energy',
      'MANUFACTURING': 'Manufacturing',
      'RETAIL': 'Retail',
      'LOGISTICS': 'Logistics',
      'TECHNOLOGY': 'Technology',
      'NGO': 'Non-Governmental Organization',
      'OTHER': 'Other'
    };
    return labels[sector] || sector;
  }

  private getSizeLabel(size: string): string {
    const labels: Record<string, string> = {
      'SMALL': 'Small (1-50)',
      'MEDIUM': 'Medium (51-250)',
      'LARGE': 'Large (251-1000)'
    };
    return labels[size] || size;
  }

  private async calculateBenchmarks(organization: any) {
    const orgScore = organization.csiScore || 0;
    
    // Calculate sector rank and percentile
    const sectorOrgs = await this.prisma.organization.findMany({
      where: {
        sector: organization.sector,
        isActive: true,
        isPublic: true,
        csiScore: { not: null }
      },
      select: { csiScore: true },
      orderBy: { csiScore: 'desc' }
    });

    const sectorRank = sectorOrgs.findIndex(org => (org.csiScore || 0) <= orgScore) + 1;
    const sectorPercentile = sectorOrgs.length > 0 
      ? Math.round(((sectorOrgs.length - sectorRank + 1) / sectorOrgs.length) * 100)
      : 0;

    // Calculate regional rank and percentile
    const regionalOrgs = await this.prisma.organization.findMany({
      where: {
        region: organization.region,
        isActive: true,
        isPublic: true,
        csiScore: { not: null }
      },
      select: { csiScore: true },
      orderBy: { csiScore: 'desc' }
    });

    const regionalRank = regionalOrgs.findIndex(org => (org.csiScore || 0) <= orgScore) + 1;
    const regionalPercentile = regionalOrgs.length > 0 
      ? Math.round(((regionalOrgs.length - regionalRank + 1) / regionalOrgs.length) * 100)
      : 0;

    // Calculate national rank and percentile
    const nationalOrgs = await this.prisma.organization.findMany({
      where: {
        isActive: true,
        isPublic: true,
        csiScore: { not: null }
      },
      select: { csiScore: true },
      orderBy: { csiScore: 'desc' }
    });

    const nationalRank = nationalOrgs.findIndex(org => (org.csiScore || 0) <= orgScore) + 1;
    const nationalPercentile = nationalOrgs.length > 0 
      ? Math.round(((nationalOrgs.length - nationalRank + 1) / nationalOrgs.length) * 100)
      : 0;

    return {
      sectorRank: sectorRank || 1,
      regionalRank: regionalRank || 1,
      nationalRank: nationalRank || 1,
      sectorPercentile,
      regionalPercentile,
      nationalPercentile
    };
  }

  private calculateRiskLevel(score: number): string {
    if (score >= 81) return 'VERY_LOW';
    if (score >= 61) return 'LOW';
    if (score >= 41) return 'MEDIUM';
    if (score >= 21) return 'HIGH';
    return 'VERY_HIGH';
  }
}