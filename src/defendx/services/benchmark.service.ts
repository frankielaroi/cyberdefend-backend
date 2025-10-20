import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BenchmarkService {
  constructor(private prisma: PrismaService) {}

  async getBenchmarks(region: string, sector: string, size: string) {
    const period = this.getCurrentPeriod();

    // Try to get from cached benchmark data first
    const [regionalCached, sectoralCached, sizeCached] = await Promise.all([
      this.getRegionalBenchmark(region, period),
      this.getSectoralBenchmark(sector, period),
      this.getSizeBasedBenchmark(size, period),
    ]);

    // If cached data exists, use it; otherwise calculate on-the-fly from actual organizations
    const [regional, sectoral, sizeBased] = await Promise.all([
      regionalCached || this.calculateLiveBenchmark({ region }),
      sectoralCached || this.calculateLiveBenchmark({ sector }),
      sizeCached || this.calculateLiveBenchmark({ size }),
    ]);

    return {
      regional,
      sectoral,
      sizeBased,
    };
  }

  private async getRegionalBenchmark(region: string, period: string) {
    const benchmark = await this.prisma.benchmarkData.findFirst({
      where: { region, period },
    });
    return benchmark?.avgScore || null;
  }

  private async getSectoralBenchmark(sector: string, period: string) {
    const benchmark = await this.prisma.benchmarkData.findFirst({
      where: { sector: sector as any, period },
    });
    return benchmark?.avgScore || null;
  }

  private async getSizeBasedBenchmark(size: string, period: string) {
    const benchmark = await this.prisma.benchmarkData.findFirst({
      where: { size: size as any, period },
    });
    return benchmark?.avgScore || null;
  }

  /**
   * Calculate live benchmark from actual organization data
   */
  private async calculateLiveBenchmark(filter: { region?: string; sector?: string; size?: string }): Promise<number> {
    const where: any = {
      csiScore: { not: null },
      isActive: true,
    };

    if (filter.region) where.region = filter.region;
    if (filter.sector) where.sector = filter.sector;
    if (filter.size) where.size = filter.size;

    const result = await this.prisma.organization.aggregate({
      where,
      _avg: {
        csiScore: true,
      },
    });

    return result._avg.csiScore || 0;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${year}-Q${quarter}`;
  }

  /**
   * Calculate percentile ranking for an organization based on actual company data
   */
  async calculatePercentile(organizationId: string): Promise<{
    industryPercentile: number | null;
    sizePercentile: number | null;
    regionPercentile: number | null;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        csiScore: true,
        sector: true,
        size: true,
        region: true,
      },
    });

    if (!org || !org.csiScore) {
      return {
        industryPercentile: null,
        sizePercentile: null,
        regionPercentile: null,
      };
    }

    // Calculate industry (sector) percentile
    const industryPercentile = await this.calculatePercentileForFilter(
      org.csiScore,
      { sector: org.sector }
    );

    // Calculate size percentile
    const sizePercentile = await this.calculatePercentileForFilter(
      org.csiScore,
      { size: org.size }
    );

    // Calculate regional percentile
    const regionPercentile = org.region 
      ? await this.calculatePercentileForFilter(org.csiScore, { region: org.region })
      : null;

    return {
      industryPercentile,
      sizePercentile,
      regionPercentile,
    };
  }

  /**
   * Calculate percentile for a specific filter
   */
  private async calculatePercentileForFilter(
    score: number,
    filter: { region?: string; sector?: string; size?: string }
  ): Promise<number | null> {
    const where: any = {
      csiScore: { not: null },
      isActive: true,
    };

    if (filter.region) where.region = filter.region;
    if (filter.sector) where.sector = filter.sector;
    if (filter.size) where.size = filter.size;

    // Get all scores in this category
    const organizations = await this.prisma.organization.findMany({
      where,
      select: { csiScore: true },
      orderBy: { csiScore: 'asc' },
    });

    if (organizations.length === 0) return null;

    // Count how many organizations have a lower score
    const lowerCount = organizations.filter(
      (o) => o.csiScore !== null && o.csiScore < score
    ).length;

    // Calculate percentile (what percentage of orgs this org is better than)
    const percentile = (lowerCount / organizations.length) * 100;

    return Math.round(percentile);
  }

  async updateBenchmarks() {
    const period = this.getCurrentPeriod();
    
    // Get all combinations of region, sector, and size from actual organizations
    const allOrganizations = await this.prisma.organization.findMany({
      where: {
        csiScore: { not: null },
        isActive: true,
      },
      select: {
        region: true,
        sector: true,
        size: true,
        csiScore: true,
      },
    });

    // Group by all combinations of region, sector, and size
    const benchmarkMap = new Map<string, { scores: number[]; region: string; sector: string; size: string }>();

    for (const org of allOrganizations) {
      if (!org.csiScore || !org.region) continue;

      // Create benchmark entries for different combinations
      const combinations = [
        // By region only
        { region: org.region, sector: org.sector, size: org.size },
        // Add more granular combinations as needed
      ];

      for (const combo of combinations) {
        const key = `${combo.region}-${combo.sector}-${combo.size}`;
        if (!benchmarkMap.has(key)) {
          benchmarkMap.set(key, {
            scores: [],
            region: combo.region,
            sector: combo.sector,
            size: combo.size,
          });
        }
        benchmarkMap.get(key)!.scores.push(org.csiScore);
      }
    }

    // Upsert all benchmark data
    const upsertPromises = [];
    for (const [key, data] of benchmarkMap.entries()) {
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      
      upsertPromises.push(
        this.prisma.benchmarkData.upsert({
          where: {
            region_sector_size_period: {
              region: data.region,
              sector: data.sector as any,
              size: data.size as any,
              period,
            },
          },
          update: {
            avgScore,
            totalOrgs: data.scores.length,
          },
          create: {
            region: data.region,
            sector: data.sector as any,
            size: data.size as any,
            avgScore,
            totalOrgs: data.scores.length,
            period,
          },
        })
      );
    }

    await Promise.all(upsertPromises);

    return { 
      message: 'Benchmarks updated successfully',
      period,
      totalBenchmarks: benchmarkMap.size,
      totalOrganizations: allOrganizations.length,
    };
  }
}