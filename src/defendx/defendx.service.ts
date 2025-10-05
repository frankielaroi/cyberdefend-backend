import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AssessmentService } from './services/assessment.service';
import { QuestionService } from './services/question.service';
import { BenchmarkService } from './services/benchmark.service';

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

  async getCSILeaderboard(sector?: string, limit: number = 10) {
    const where: any = {
      isPublic: true,
      isActive: true,
      csiScore: { not: null },
    };

    if (sector) where.sector = sector;

    const organizations = await this.prisma.organization.findMany({
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
      take: limit,
    });

    return {
      data: organizations.map((org, index) => ({
        ...org,
        rank: index + 1,
      })),
      metadata: {
        sector: sector || 'all',
        limit,
        generatedAt: new Date(),
      },
    };
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

  private calculateRiskLevel(score: number): string {
    if (score >= 81) return 'VERY_LOW';
    if (score >= 61) return 'LOW';
    if (score >= 41) return 'MEDIUM';
    if (score >= 21) return 'HIGH';
    return 'VERY_HIGH';
  }
}