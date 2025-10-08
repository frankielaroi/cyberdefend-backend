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
      success: true,
      data: {
        regions,
        national: {
          averageScore: nationalStats._avg.csiScore || 0,
          totalOrganizations: nationalStats._count._all
        }
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
            result: true
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

    // Mock category breakdown - in real implementation, calculate from assessment results
    const categoryBreakdown = {
      governance: 88,
      riskManagement: 92,
      assetManagement: 95,
      accessControl: 90,
      dataProtection: 87
    };

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
    // Mock implementation - in real app, calculate trends from historical data
    return {
      success: true,
      data: {
        overallTrend: 'improving',
        averageScoreChange: 2.5,
        timeframe: query.timeframe || 'monthly',
        filters: {
          sector: query.sector,
          region: query.region
        },
        trendData: []
      }
    };
  }

  async getCSIFilterOptions(): Promise<FilterOptionsResponseDto> {
    const [sectorCounts, regionCounts, sizeCounts] = await Promise.all([
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
    // Mock implementation
    return {
      success: true,
      message: `Export in ${query.format} format initiated`,
      downloadUrl: '/api/downloads/csi-export.csv'
    };
  }

  async getCSIInsights(): Promise<InsightsResponseDto> {
    // Get top performers
    const topOverall = await this.getCSILeaderboard({ limit: 5 });
    
    // Mock implementation for other insights
    return {
      success: true,
      data: {
        topPerformers: {
          bySector: topOverall.data.slice(0, 3),
          byRegion: topOverall.data.slice(0, 3),
          overall: topOverall.data
        },
        trends: {
          improving: [],
          declining: []
        },
        benchmarks: {
          nationalAverage: 71.8,
          sectorAverages: {
            'BANKING': 82.5,
            'TELECOMMUNICATIONS': 78.3,
            'GOVERNMENT': 69.2
          },
          regionalAverages: {
            'Greater Accra': 75.2,
            'Ashanti': 73.1,
            'Western': 68.9
          },
          sizeAverages: {
            'LARGE': 78.3,
            'MEDIUM': 72.1,
            'SMALL': 67.8
          }
        },
        riskDistribution: {
          lowRisk: 25,
          mediumRisk: 85,
          highRisk: 40
        }
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
    // Mock implementation - in real app, calculate from actual data
    return {
      sectorRank: 1,
      regionalRank: 2,
      nationalRank: 3,
      sectorPercentile: 95,
      regionalPercentile: 88,
      nationalPercentile: 85
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