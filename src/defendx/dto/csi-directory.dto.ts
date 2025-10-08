import { IsString, IsOptional, IsEnum, IsNumber, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum SortBy {
  SCORE = 'score',
  NAME = 'name',
  LAST_ASSESSMENT_DATE = 'lastAssessmentDate',
  CREATED_AT = 'createdAt'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export enum CSITier {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F'
}

export enum Sector {
  BANKING = 'BANKING',
  TELECOMMUNICATIONS = 'TELECOMMUNICATIONS',
  INSURANCE = 'INSURANCE',
  GOVERNMENT = 'GOVERNMENT',
  HEALTHCARE = 'HEALTHCARE',
  EDUCATION = 'EDUCATION',
  ENERGY = 'ENERGY',
  MANUFACTURING = 'MANUFACTURING',
  RETAIL = 'RETAIL',
  LOGISTICS = 'LOGISTICS',
  TECHNOLOGY = 'TECHNOLOGY',
  NGO = 'NGO',
  OTHER = 'OTHER'
}

export enum OrganizationSize {
  SMALL = 'SMALL',      // 1-50
  MEDIUM = 'MEDIUM',    // 51-250
  LARGE = 'LARGE'       // 251-1000
}

export enum TimeFrame {
  CURRENT = 'current',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json'
}

export class CSIDirectoryQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by sector',
    enum: Sector,
    example: Sector.BANKING,
  })
  @IsOptional()
  @IsEnum(Sector, { message: 'Please provide a valid sector' })
  sector?: Sector;

  @ApiPropertyOptional({
    description: 'Filter by geographic region',
    example: 'Greater Accra',
  })
  @IsOptional()
  @IsString({ message: 'Region must be a string' })
  region?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization size',
    enum: OrganizationSize,
    example: OrganizationSize.LARGE,
  })
  @IsOptional()
  @IsEnum(OrganizationSize, { message: 'Please provide a valid organization size' })
  size?: OrganizationSize;

  @ApiPropertyOptional({
    description: 'Minimum score filter',
    example: 70,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum score must be a number' })
  @Min(0, { message: 'Minimum score cannot be negative' })
  @Max(100, { message: 'Minimum score cannot exceed 100' })
  minScore?: number;

  @ApiPropertyOptional({
    description: 'Maximum score filter',
    example: 100,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Maximum score must be a number' })
  @Min(0, { message: 'Maximum score cannot be negative' })
  @Max(100, { message: 'Maximum score cannot exceed 100' })
  maxScore?: number;

  @ApiPropertyOptional({
    description: 'Filter by performance tier',
    enum: CSITier,
    example: CSITier.A,
  })
  @IsOptional()
  @IsEnum(CSITier, { message: 'Please provide a valid tier' })
  tier?: CSITier;

  @ApiPropertyOptional({
    description: 'Text search in organization names',
    example: 'Bank',
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: SortBy,
    example: SortBy.SCORE,
    default: SortBy.SCORE,
  })
  @IsOptional()
  @IsEnum(SortBy, { message: 'Please provide a valid sort field' })
  sortBy?: SortBy = SortBy.SCORE;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SortOrder,
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Please provide a valid sort order' })
  sortOrder?: SortOrder = SortOrder.DESC;
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    description: 'Number of top performers to return',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by sector',
    enum: Sector,
    example: Sector.BANKING,
  })
  @IsOptional()
  @IsEnum(Sector, { message: 'Please provide a valid sector' })
  sector?: Sector;

  @ApiPropertyOptional({
    description: 'Filter by region',
    example: 'Greater Accra',
  })
  @IsOptional()
  @IsString({ message: 'Region must be a string' })
  region?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization size',
    enum: OrganizationSize,
    example: OrganizationSize.LARGE,
  })
  @IsOptional()
  @IsEnum(OrganizationSize, { message: 'Please provide a valid organization size' })
  size?: OrganizationSize;

  @ApiPropertyOptional({
    description: 'Time period for leaderboard',
    enum: TimeFrame,
    example: TimeFrame.CURRENT,
    default: TimeFrame.CURRENT,
  })
  @IsOptional()
  @IsEnum(TimeFrame, { message: 'Please provide a valid timeframe' })
  timeframe?: TimeFrame = TimeFrame.CURRENT;
}

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search term',
    example: 'SecureBank',
  })
  @IsString({ message: 'Search query must be a string' })
  q: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  limit?: number = 20;
}

export class TrendsQueryDto {
  @ApiPropertyOptional({
    description: 'Time period for trends',
    enum: TimeFrame,
    example: TimeFrame.MONTHLY,
    default: TimeFrame.MONTHLY,
  })
  @IsOptional()
  @IsEnum(TimeFrame, { message: 'Please provide a valid timeframe' })
  timeframe?: TimeFrame = TimeFrame.MONTHLY;

  @ApiPropertyOptional({
    description: 'Filter by sector',
    enum: Sector,
    example: Sector.BANKING,
  })
  @IsOptional()
  @IsEnum(Sector, { message: 'Please provide a valid sector' })
  sector?: Sector;

  @ApiPropertyOptional({
    description: 'Filter by region',
    example: 'Greater Accra',
  })
  @IsOptional()
  @IsString({ message: 'Region must be a string' })
  region?: string;
}

export class ExportQueryDto extends CSIDirectoryQueryDto {
  @ApiPropertyOptional({
    description: 'Export format',
    enum: ExportFormat,
    example: ExportFormat.CSV,
    default: ExportFormat.CSV,
  })
  @IsOptional()
  @IsEnum(ExportFormat, { message: 'Please provide a valid export format' })
  format?: ExportFormat = ExportFormat.CSV;
}

// Response DTOs
export class OrganizationDirectoryItemDto {
  @ApiProperty({ description: 'Organization unique identifier' })
  organizationId: string;

  @ApiProperty({ description: 'Organization name' })
  name: string;

  @ApiProperty({ description: 'CSI score (0-100)' })
  score: number;

  @ApiProperty({ description: 'Performance tier', enum: CSITier })
  tier: CSITier;

  @ApiProperty({ description: 'Industry sector', enum: Sector })
  sector: Sector;

  @ApiProperty({ description: 'Geographic region' })
  region: string;

  @ApiProperty({ description: 'Organization size', enum: OrganizationSize })
  size: OrganizationSize;

  @ApiProperty({ description: 'Date of last assessment' })
  lastAssessmentDate: Date;

  @ApiProperty({ description: 'Current rank position' })
  rank: number;

  @ApiPropertyOptional({ description: 'Previous rank position' })
  previousRank?: number;

  @ApiPropertyOptional({ description: 'Rank change (+/-)' })
  rankChange?: number;
}

export class PaginationDto {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class CSIDirectoryResponseDto {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiProperty({ description: 'List of organizations', type: [OrganizationDirectoryItemDto] })
  data: OrganizationDirectoryItemDto[];

  @ApiProperty({ description: 'Pagination information', type: PaginationDto })
  pagination: PaginationDto;
}

export class RegionHeatmapDto {
  @ApiProperty({ description: 'Region name' })
  name: string;

  @ApiProperty({ description: 'Region code' })
  code: string;

  @ApiProperty({ description: 'Average CSI score for region' })
  averageScore: number;

  @ApiProperty({ description: 'Number of organizations in region' })
  organizationCount: number;

  @ApiProperty({ description: 'Geographic coordinates' })
  coordinates: { lat: number; lng: number };

  @ApiProperty({ description: 'Tier distribution in region' })
  distribution: { A: number; B: number; C: number; D: number; F: number };
}

export class HeatmapResponseDto {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiProperty({
    description: 'Heatmap data',
    type: 'object',
    properties: {
      regions: { type: 'array', items: { $ref: '#/components/schemas/RegionHeatmapDto' } },
      national: {
        type: 'object',
        properties: {
          averageScore: { type: 'number' },
          totalOrganizations: { type: 'number' }
        }
      }
    }
  })
  data: {
    regions: RegionHeatmapDto[];
    national: {
      averageScore: number;
      totalOrganizations: number;
    };
  };
}

export class HistoricalScoreDto {
  @ApiProperty({ description: 'Assessment date' })
  date: Date;

  @ApiProperty({ description: 'Score at that time' })
  score: number;

  @ApiProperty({ description: 'Tier at that time' })
  tier: CSITier;
}

export class BenchmarksDto {
  @ApiProperty({ description: 'Rank within sector' })
  sectorRank: number;

  @ApiProperty({ description: 'Rank within region' })
  regionalRank: number;

  @ApiProperty({ description: 'National rank' })
  nationalRank: number;

  @ApiProperty({ description: 'Percentile within sector' })
  sectorPercentile: number;

  @ApiProperty({ description: 'Percentile within region' })
  regionalPercentile: number;

  @ApiProperty({ description: 'National percentile' })
  nationalPercentile: number;
}

export class CategoryBreakdownDto {
  @ApiProperty({ description: 'Governance score' })
  governance: number;

  @ApiProperty({ description: 'Risk management score' })
  riskManagement: number;

  @ApiProperty({ description: 'Asset management score' })
  assetManagement: number;

  @ApiProperty({ description: 'Access control score' })
  accessControl: number;

  @ApiProperty({ description: 'Data protection score' })
  dataProtection: number;
}

export class OrganizationProfileDto {
  @ApiProperty({ description: 'Organization unique identifier' })
  organizationId: string;

  @ApiProperty({ description: 'Organization name' })
  name: string;

  @ApiProperty({ description: 'Current CSI score' })
  score: number;

  @ApiProperty({ description: 'Current performance tier' })
  tier: CSITier;

  @ApiProperty({ description: 'Industry sector' })
  sector: Sector;

  @ApiProperty({ description: 'Geographic region' })
  region: string;

  @ApiProperty({ description: 'Organization size' })
  size: OrganizationSize;

  @ApiProperty({ description: 'Date of last assessment' })
  lastAssessmentDate: Date;

  @ApiProperty({ description: 'Historical scores', type: [HistoricalScoreDto] })
  historicalScores: HistoricalScoreDto[];

  @ApiProperty({ description: 'Benchmark comparisons', type: BenchmarksDto })
  benchmarks: BenchmarksDto;

  @ApiProperty({ description: 'Category-wise score breakdown', type: CategoryBreakdownDto })
  categoryBreakdown: CategoryBreakdownDto;
}

export class FilterOptionDto {
  @ApiProperty({ description: 'Filter value' })
  value: string;

  @ApiProperty({ description: 'Display label' })
  label: string;

  @ApiProperty({ description: 'Number of items with this filter' })
  count: number;
}

export class ScoreRangeDto {
  @ApiProperty({ description: 'Minimum score' })
  min: number;

  @ApiProperty({ description: 'Maximum score' })
  max: number;

  @ApiProperty({ description: 'Range label' })
  label: string;

  @ApiProperty({ description: 'Number of organizations in range' })
  count: number;
}

export class FilterOptionsResponseDto {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiProperty({
    description: 'Available filter options',
    type: 'object',
    properties: {
      sectors: { type: 'array', items: { $ref: '#/components/schemas/FilterOptionDto' } },
      regions: { type: 'array', items: { $ref: '#/components/schemas/FilterOptionDto' } },
      sizes: { type: 'array', items: { $ref: '#/components/schemas/FilterOptionDto' } },
      scoreRanges: { type: 'array', items: { $ref: '#/components/schemas/ScoreRangeDto' } },
      tiers: { type: 'array', items: { $ref: '#/components/schemas/FilterOptionDto' } }
    }
  })
  data: {
    sectors: FilterOptionDto[];
    regions: FilterOptionDto[];
    sizes: FilterOptionDto[];
    scoreRanges: ScoreRangeDto[];
    tiers: FilterOptionDto[];
  };
}

export class InsightsBenchmarksDto {
  @ApiProperty({ description: 'National average score' })
  nationalAverage: number;

  @ApiProperty({ description: 'Average scores by sector' })
  sectorAverages: Record<string, number>;

  @ApiProperty({ description: 'Average scores by region' })
  regionalAverages: Record<string, number>;

  @ApiProperty({ description: 'Average scores by organization size' })
  sizeAverages: Record<string, number>;
}

export class RiskDistributionDto {
  @ApiProperty({ description: 'Low risk organizations (80-100 score)' })
  lowRisk: number;

  @ApiProperty({ description: 'Medium risk organizations (60-79 score)' })
  mediumRisk: number;

  @ApiProperty({ description: 'High risk organizations (0-59 score)' })
  highRisk: number;
}

export class InsightsResponseDto {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiProperty({
    description: 'Analytics and insights data',
    type: 'object'
  })
  data: {
    topPerformers: {
      bySector: OrganizationDirectoryItemDto[];
      byRegion: OrganizationDirectoryItemDto[];
      overall: OrganizationDirectoryItemDto[];
    };
    trends: {
      improving: OrganizationDirectoryItemDto[];
      declining: OrganizationDirectoryItemDto[];
    };
    benchmarks: InsightsBenchmarksDto;
    riskDistribution: RiskDistributionDto;
  };
}