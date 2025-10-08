import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { DefendxService } from './defendx.service';
import { AssessmentService } from './services/assessment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CSIDirectoryQueryDto } from './dto/assessment.dto';
import {
  CSIDirectoryQueryDto as EnhancedCSIDirectoryQueryDto,
  LeaderboardQueryDto,
  SearchQueryDto,
  TrendsQueryDto,
  ExportQueryDto,
  CSIDirectoryResponseDto,
  HeatmapResponseDto,
  OrganizationProfileDto,
  FilterOptionsResponseDto,
  InsightsResponseDto
} from './dto/csi-directory.dto';

@ApiTags('csi-directory')
@Controller('csi-directory')
export class CSIDirectoryController {
  constructor(
    private defendxService: DefendxService,
    private assessmentService: AssessmentService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ 
    summary: 'Get CSI directory with comprehensive filtering and pagination',
    description: 'Main CSI Directory endpoint with advanced filtering, sorting, and search capabilities'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'CSI directory retrieved successfully',
    type: CSIDirectoryResponseDto
  })
  async getCSIDirectory(@Query() query: EnhancedCSIDirectoryQueryDto): Promise<CSIDirectoryResponseDto> {
    return this.defendxService.getCSIDirectory(query);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: '[LEGACY] Public endpoint listing all published Cyber Safety Index (CSI) entries' })
  @ApiResponse({ status: 200, description: 'CSI directory retrieved successfully' })
  @ApiQuery({ name: 'region', required: false, description: 'Filter by region' })
  @ApiQuery({ name: 'sector', required: false, description: 'Filter by sector' })
  @ApiQuery({ name: 'size', required: false, description: 'Filter by organization size' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getPublicCSIDirectory(
    @Query('region') region?: string,
    @Query('sector') sector?: string,
    @Query('size') size?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const query: CSIDirectoryQueryDto = {
      region,
      sector: sector as any,
      size: size as any,
      skip: page ? (page - 1) * (limit || 50) : 0,
      take: limit || 50,
      includePrivate: false
    };
    return this.assessmentService.getCSIDirectory(query);
  }

  @Public()
  @Get('leaderboard')
  @ApiOperation({ 
    summary: 'Get top-performing organizations leaderboard',
    description: 'Returns top performers with optional filtering by sector, region, size, and timeframe'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Leaderboard retrieved successfully',
    type: CSIDirectoryResponseDto
  })
  async getCSILeaderboard(@Query() query: LeaderboardQueryDto): Promise<CSIDirectoryResponseDto> {
    return this.defendxService.getCSILeaderboard(query);
  }

  @Public()
  @Get('benchmarks/regional')
  @ApiOperation({ 
    summary: 'Get regional CSI benchmarks',
    description: 'View average cybersecurity scores by region for benchmarking purposes'
  })
  @ApiResponse({ status: 200, description: 'Regional benchmarks retrieved successfully' })
  @ApiQuery({ name: 'region', required: false, description: 'Specific region to filter' })
  @ApiQuery({ name: 'sector', required: false, description: 'Filter by sector within region' })
  async getRegionalBenchmarks(
    @Query('region') region?: string,
    @Query('sector') sector?: string,
  ) {
    // Enhanced benchmark data from assessment service
    const stats = await this.assessmentService.getAssessmentStats();
    return {
      benchmarks: stats,
      region,
      sector
    };
  }

  @Public()
  @Get('benchmarks/sectoral')
  @ApiOperation({ 
    summary: 'Get sectoral CSI benchmarks',
    description: 'View average cybersecurity scores by industry sector for comparison'
  })
  @ApiResponse({ status: 200, description: 'Sectoral benchmarks retrieved successfully' })
  @ApiQuery({ name: 'sector', required: false, description: 'Specific sector to filter' })
  @ApiQuery({ name: 'size', required: false, description: 'Filter by organization size within sector' })
  async getSectoralBenchmarks(
    @Query('sector') sector?: string,
    @Query('size') size?: string,
  ) {
    // Enhanced benchmark data from assessment service
    const stats = await this.assessmentService.getAssessmentStats();
    return {
      benchmarks: stats,
      sector,
      size
    };
  }

  @Public()
  @Get('tiers')
  @ApiOperation({ 
    summary: 'Get CSI tier distribution and statistics',
    description: 'View distribution of organizations across different cybersecurity tiers'
  })
  @ApiResponse({ status: 200, description: 'Tier distribution retrieved successfully' })
  async getTierDistribution() {
    return this.assessmentService.getAssessmentStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-organization')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current user organization CSI information',
    description: 'View your organization CSI score and position in the directory'
  })
  @ApiResponse({ status: 200, description: 'Organization CSI data retrieved successfully' })
  async getMyOrganizationCSI(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
  ) {
    const stats = await this.assessmentService.getAssessmentStats(organizationId);
    return {
      organizationId,
      stats,
      ranking: {
        overall: 0,
        regional: 0,
        sectoral: 0
      }
    };
  }

  @Public()
  @Get('analytics')
  @ApiOperation({ 
    summary: 'Get CSI analytics and trends',
    description: 'View cybersecurity trends and analytics across the directory'
  })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period for trends (1m, 3m, 6m, 1y)' })
  @ApiQuery({ name: 'region', required: false, description: 'Filter analytics by region' })
  @ApiQuery({ name: 'sector', required: false, description: 'Filter analytics by sector' })
  async getAnalytics(
    @Query('period') period?: string,
    @Query('region') region?: string,
    @Query('sector') sector?: string,
  ) {
    const stats = await this.assessmentService.getAssessmentStats();
    return {
      overallStats: stats,
      trends: {
        scoreImprovement: 0,
        newAssessments: 0,
        tierMovements: {}
      },
      period: period || '3m',
      filters: { region, sector }
    };
  }

  @Public()
  @Get('heatmap')
  @ApiOperation({ 
    summary: 'Get geographic heatmap data for CSI visualization',
    description: 'Returns average cyber readiness scores by region with coordinates and distribution data'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Regional heatmap data retrieved successfully',
    type: HeatmapResponseDto
  })
  async getCSIHeatmap(): Promise<HeatmapResponseDto> {
    return this.defendxService.getCSIHeatmapData();
  }

  @Public()
  @Get('profile/:organizationId')
  @ApiOperation({ 
    summary: 'Get detailed organization profile',
    description: 'Returns comprehensive organization data including historical scores, benchmarks, and category breakdown'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Organization profile retrieved successfully',
    type: OrganizationProfileDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Organization not found' 
  })
  async getOrganizationProfile(@Param('organizationId') organizationId: string): Promise<OrganizationProfileDto> {
    return this.defendxService.getOrganizationProfile(organizationId);
  }

  @Public()
  @Get('search')
  @ApiOperation({ 
    summary: 'Search CSI directory by organization name',
    description: 'Search for organizations in the CSI directory with text matching'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results retrieved successfully',
    type: CSIDirectoryResponseDto
  })
  async searchDirectory(@Query() query: SearchQueryDto): Promise<CSIDirectoryResponseDto> {
    return this.defendxService.searchCSIDirectory(query);
  }

  @Public()
  @Get('trends')
  @ApiOperation({ 
    summary: 'Get CSI trends and analytics over time',
    description: 'View cybersecurity trends and analytics with optional filtering by timeframe, sector, and region'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Trends data retrieved successfully'
  })
  async getTrends(@Query() query: TrendsQueryDto) {
    return this.defendxService.getCSITrends(query);
  }

  @Public()
  @Get('filters')
  @ApiOperation({ 
    summary: 'Get available filter options',
    description: 'Returns all available filter options with counts for dynamic filter UI'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Filter options retrieved successfully',
    type: FilterOptionsResponseDto
  })
  async getFilterOptions(): Promise<FilterOptionsResponseDto> {
    return this.defendxService.getCSIFilterOptions();
  }

  @Public()
  @Get('export')
  @ApiOperation({ 
    summary: 'Export CSI directory data',
    description: 'Export filtered CSI directory data in various formats (CSV, Excel, JSON)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Data exported successfully'
  })
  async exportData(@Query() query: ExportQueryDto) {
    return this.defendxService.exportCSIData(query);
  }

  @Public()
  @Get('insights')
  @ApiOperation({ 
    summary: 'Get comprehensive CSI insights and analytics',
    description: 'Returns detailed analytics including top performers, trends, benchmarks, and risk distribution'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Insights data retrieved successfully',
    type: InsightsResponseDto
  })
  async getInsights(): Promise<InsightsResponseDto> {
    return this.defendxService.getCSIInsights();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CSA_ADMIN', 'SUPER_ADMIN')
  @Get('admin/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin-only endpoint providing aggregate national/sector statistics for CSA' })
  @ApiResponse({ status: 200, description: 'Admin statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied - admin only' })
  async getCSIAdminStats() {
    const stats = await this.assessmentService.getAssessmentStats();
    return {
      ...stats,
      adminData: await this.defendxService.getCSIAdminStats()
    };
  }
}