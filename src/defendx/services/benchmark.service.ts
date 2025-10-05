import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BenchmarkService {
  constructor(private prisma: PrismaService) {}

  async getBenchmarks(region: string, sector: string, size: string) {
    const period = this.getCurrentPeriod();

    const [regional, sectoral, sizeBased] = await Promise.all([
      this.getRegionalBenchmark(region, period),
      this.getSectoralBenchmark(sector, period),
      this.getSizeBasedBenchmark(size, period),
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
    return benchmark?.avgScore || 0;
  }

  private async getSectoralBenchmark(sector: string, period: string) {
    const benchmark = await this.prisma.benchmarkData.findFirst({
      where: { sector: sector as any, period },
    });
    return benchmark?.avgScore || 0;
  }

  private async getSizeBasedBenchmark(size: string, period: string) {
    const benchmark = await this.prisma.benchmarkData.findFirst({
      where: { size: size as any, period },
    });
    return benchmark?.avgScore || 0;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${year}-Q${quarter}`;
  }

  async updateBenchmarks() {
    const period = this.getCurrentPeriod();
    
    // Calculate regional benchmarks
    const regionalStats = await this.prisma.organization.groupBy({
      by: ['region'],
      where: {
        csiScore: { not: null },
        isActive: true,
      },
      _avg: {
        csiScore: true,
      },
      _count: {
        id: true,
      },
    });

    for (const stat of regionalStats) {
      await this.prisma.benchmarkData.upsert({
        where: {
          region_sector_size_period: {
            region: stat.region,
            sector: 'TECHNOLOGY', // Default sector for regional stats
            size: 'MEDIUM', // Default size for regional stats
            period,
          },
        },
        update: {
          avgScore: stat._avg.csiScore || 0,
          totalOrgs: stat._count.id,
        },
        create: {
          region: stat.region,
          sector: 'TECHNOLOGY',
          size: 'MEDIUM',
          avgScore: stat._avg.csiScore || 0,
          totalOrgs: stat._count.id,
          period,
        },
      });
    }

    // Calculate sectoral benchmarks
    const sectoralStats = await this.prisma.organization.groupBy({
      by: ['sector'],
      where: {
        csiScore: { not: null },
        isActive: true,
      },
      _avg: {
        csiScore: true,
      },
      _count: {
        id: true,
      },
    });

    for (const stat of sectoralStats) {
      await this.prisma.benchmarkData.upsert({
        where: {
          region_sector_size_period: {
            region: 'Greater Accra', // Default region for sectoral stats
            sector: stat.sector,
            size: 'MEDIUM',
            period,
          },
        },
        update: {
          avgScore: stat._avg.csiScore || 0,
          totalOrgs: stat._count.id,
        },
        create: {
          region: 'Greater Accra',
          sector: stat.sector,
          size: 'MEDIUM',
          avgScore: stat._avg.csiScore || 0,
          totalOrgs: stat._count.id,
          period,
        },
      });
    }

    return { message: 'Benchmarks updated successfully' };
  }
}