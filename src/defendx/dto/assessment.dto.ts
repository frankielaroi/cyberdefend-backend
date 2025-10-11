import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsNumber, IsInt, Min, Max, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AssessmentType {
  CSI_ASSESSMENT = 'CSI_ASSESSMENT',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',
  SECURITY_AUDIT = 'SECURITY_AUDIT',
  BASELINE_ASSESSMENT = 'BASELINE_ASSESSMENT',
}

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  YES_NO = 'yes_no',
  RATING = 'rating',
  TEXT = 'text',
}

export enum CSITier {
  A = 'A',
  B = 'B', 
  C = 'C',
  D = 'D',
  F = 'F',
}

export class CreateAssessmentDto {
  @ApiProperty({
    description: 'Assessment title',
    example: 'Q4 2024 Cybersecurity Assessment',
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiPropertyOptional({
    description: 'Assessment description',
    example: 'Quarterly cybersecurity readiness evaluation',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({
    description: 'Type of assessment',
    enum: AssessmentType,
    example: AssessmentType.CSI_ASSESSMENT,
  })
  @IsEnum(AssessmentType, { message: 'Please provide a valid assessment type' })
  type: AssessmentType;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org_123',
  })
  @IsString({ message: 'Organization ID must be a string' })
  @IsNotEmpty({ message: 'Organization ID is required' })
  organizationId: string;
}

export class AssessmentResponseDto {
  @ApiProperty({
    description: 'Question ID',
    example: 'q_001',
  })
  @IsString({ message: 'Question ID must be a string' })
  @IsNotEmpty({ message: 'Question ID is required' })
  questionId: string;

  @ApiProperty({
    description: 'Answer to the question',
    example: 'Yes',
  })
  @IsNotEmpty({ message: 'Answer is required' })
  answer: string | number;

  @ApiPropertyOptional({
    description: 'Follow-up answers',
    example: ['What type of MFA do you use?'],
  })
  @IsOptional()
  @IsArray({ message: 'Follow-up answers must be an array' })
  @IsString({ each: true, message: 'Each follow-up answer must be a string' })
  followUpAnswers?: string[];

  @ApiPropertyOptional({
    description: 'Time spent on this question in seconds',
    example: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Time spent must be a number' })
  @Min(0, { message: 'Time spent cannot be negative' })
  timeSpent?: number;
}

export class SubmitAssessmentDto {
  @ApiProperty({
    description: 'Assessment ID',
    example: 'assess_abc123',
  })
  @IsString({ message: 'Assessment ID must be a string' })
  @IsNotEmpty({ message: 'Assessment ID is required' })
  assessmentId: string;

  @ApiProperty({
    description: 'Array of assessment responses',
    type: [AssessmentResponseDto],
  })
  @IsArray({ message: 'Responses must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AssessmentResponseDto)
  responses: AssessmentResponseDto[];

  @ApiPropertyOptional({
    description: 'Whether to make results public in CSI directory',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic?: boolean;
}

export class AssessmentQueryDto {
  @ApiPropertyOptional({
    description: 'Organization ID to filter by',
    example: 'org_123',
  })
  @IsOptional()
  @IsString({ message: 'Organization ID must be a string' })
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of items to skip (for pagination)',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Skip must be an integer' })
  @Min(0, { message: 'Skip cannot be negative' })
  skip?: number;

  @ApiPropertyOptional({
    description: 'Number of items to take',
    example: 20,
  })
  @IsOptional()
  @IsInt({ message: 'Take must be an integer' })
  @Min(1, { message: 'Take must be at least 1' })
  @Max(100, { message: 'Take cannot exceed 100' })
  take?: number;

  @ApiPropertyOptional({
    description: 'Filter by assessment status',
    enum: AssessmentStatus,
    example: AssessmentStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(AssessmentStatus, { message: 'Please provide a valid status' })
  status?: AssessmentStatus;

  @ApiPropertyOptional({
    description: 'Filter by assessment type',
    enum: AssessmentType,
    example: AssessmentType.CSI_ASSESSMENT,
  })
  @IsOptional()
  @IsEnum(AssessmentType, { message: 'Please provide a valid type' })
  type?: AssessmentType;

  @ApiPropertyOptional({
    description: 'Filter from date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString({ message: 'Start date must be a string' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString({ message: 'End date must be a string' })
  endDate?: string;
}

export class CSIDirectoryQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of items to skip (for pagination)',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Skip must be an integer' })
  @Min(0, { message: 'Skip cannot be negative' })
  skip?: number;

  @ApiPropertyOptional({
    description: 'Number of items to take',
    example: 20,
  })
  @IsOptional()
  @IsInt({ message: 'Take must be an integer' })
  @Min(1, { message: 'Take must be at least 1' })
  @Max(100, { message: 'Take cannot exceed 100' })
  take?: number;

  @ApiPropertyOptional({
    description: 'Field to order by',
    enum: ['score', 'date', 'name'],
    example: 'score',
  })
  @IsOptional()
  @IsEnum(['score', 'date', 'name'], { message: 'Order by must be score, date, or name' })
  orderBy?: 'score' | 'date' | 'name';

  @ApiPropertyOptional({
    description: 'Order direction',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Order direction must be asc or desc' })
  orderDirection?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Filter by CSI tier',
    enum: ['BASIC', 'FOUNDATIONAL', 'ORGANIZATIONAL', 'ADVANCED', 'PROGRESSIVE', 'INNOVATIVE'],
    example: 'ADVANCED',
  })
  @IsOptional()
  @IsEnum(['BASIC', 'FOUNDATIONAL', 'ORGANIZATIONAL', 'ADVANCED', 'PROGRESSIVE', 'INNOVATIVE'], 
    { message: 'Tier must be a valid CSI tier' })
  tier?: 'BASIC' | 'FOUNDATIONAL' | 'ORGANIZATIONAL' | 'ADVANCED' | 'PROGRESSIVE' | 'INNOVATIVE';

  @ApiPropertyOptional({
    description: 'Include private organizations',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include private must be a boolean' })
  includePrivate?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by sector',
    example: 'BANKING',
  })
  @IsOptional()
  @IsString({ message: 'Sector must be a string' })
  sector?: string;

  @ApiPropertyOptional({
    description: 'Filter by region',
    example: 'Greater Accra',
  })
  @IsOptional()
  @IsString({ message: 'Region must be a string' })
  region?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization size',
    example: 'LARGE',
  })
  @IsOptional()
  @IsString({ message: 'Size must be a string' })
  size?: string;

  @ApiPropertyOptional({
    description: 'Minimum CSI score',
    example: 70,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Minimum score must be a number' })
  @Min(0, { message: 'Minimum score cannot be less than 0' })
  @Max(100, { message: 'Minimum score cannot exceed 100' })
  minScore?: number;

  @ApiPropertyOptional({
    description: 'Maximum CSI score',
    example: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Maximum score must be a number' })
  @Min(0, { message: 'Maximum score cannot be less than 0' })
  @Max(100, { message: 'Maximum score cannot exceed 100' })
  maxScore?: number;

  @ApiPropertyOptional({
    description: 'Search organization names',
    example: 'Ghana Commercial Bank',
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;
}

export class ReportQueryDto {
  @ApiPropertyOptional({
    description: 'Report format',
    enum: ['pdf', 'html', 'json'],
    example: 'pdf',
    default: 'pdf',
  })
  @IsOptional()
  @IsEnum(['pdf', 'html', 'json'], { message: 'Format must be pdf, html, or json' })
  format?: 'pdf' | 'html' | 'json';

  @ApiPropertyOptional({
    description: 'Include detailed question responses',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include details must be a boolean' })
  includeDetails?: boolean;

  @ApiPropertyOptional({
    description: 'Include security recommendations',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include recommendations must be a boolean' })
  includeRecommendations?: boolean;

  @ApiPropertyOptional({
    description: 'Include benchmark comparisons',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include benchmarks must be a boolean' })
  includeBenchmarks?: boolean;
}

// Additional DTOs for API responses

export class SingleResponseDto {
  @ApiProperty({
    description: 'Question ID',
    example: 'q_001',
  })
  @IsString({ message: 'Question ID must be a string' })
  @IsNotEmpty({ message: 'Question ID is required' })
  questionId: string;

  @ApiProperty({
    description: 'Answer to the question',
    example: 'Yes',
  })
  @IsNotEmpty({ message: 'Answer is required' })
  answer: string | number;

  @ApiPropertyOptional({
    description: 'Time spent on question (seconds)',
    example: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Time spent must be a number' })
  @Min(0, { message: 'Time spent cannot be negative' })
  timeSpent?: number;
}

export class BulkSubmitResponseDto {
  @ApiProperty({
    description: 'Assessment ID',
    example: 'assess_abc123',
  })
  @IsString({ message: 'Assessment ID must be a string' })
  @IsNotEmpty({ message: 'Assessment ID is required' })
  assessmentId: string;

  @ApiProperty({
    description: 'Array of responses',
    type: [SingleResponseDto],
  })
  @IsArray({ message: 'Responses must be an array' })
  @ValidateNested({ each: true })
  @Type(() => SingleResponseDto)
  responses: SingleResponseDto[];
}

export class CSIScoreDto {
  @ApiProperty({
    description: 'Overall CSI score (0-5)',
    example: 3.8,
  })
  overallScore: number;

  @ApiProperty({
    description: 'Overall percentage (0-100)',
    example: 76,
  })
  overallPercentage: number;

  @ApiProperty({
    description: 'CSI tier',
    enum: ['BASIC', 'FOUNDATIONAL', 'ORGANIZATIONAL', 'ADVANCED', 'PROGRESSIVE', 'INNOVATIVE'],
    example: 'ADVANCED',
  })
  tier: string;

  @ApiProperty({
    description: 'Category-wise scores',
    example: { 'Access Control': 80, 'Network Security': 75 },
  })
  categoryScores: Record<string, number>;
}

export class AssessmentStatsDto {
  @ApiProperty({
    description: 'Total number of assessments',
    example: 150,
  })
  totalAssessments: number;

  @ApiProperty({
    description: 'Number of completed assessments',
    example: 120,
  })
  completedAssessments: number;

  @ApiProperty({
    description: 'Number of assessments in progress',
    example: 30,
  })
  inProgress: number;

  @ApiProperty({
    description: 'Average score across all assessments',
    example: 3.2,
  })
  averageScore: number;

  @ApiProperty({
    description: 'Completion rate percentage',
    example: 80,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Distribution of assessments by tier',
    example: { 'BASIC': 20, 'FOUNDATIONAL': 30, 'ORGANIZATIONAL': 40 },
  })
  tierDistribution: Record<string, number>;
}

export class CSIBenchmarkDto {
  @ApiProperty({
    description: 'Industry percentile ranking',
    example: 65,
  })
  industryPercentile: number;

  @ApiProperty({
    description: 'Size-based percentile ranking',
    example: 72,
  })
  sizePercentile: number;

  @ApiProperty({
    description: 'Regional percentile ranking',
    example: 58,
  })
  regionPercentile: number;
}

export class DashboardDto {
  @ApiProperty({
    description: 'Organization information',
  })
  organization: any;

  @ApiProperty({
    description: 'Assessment statistics',
  })
  stats: any;

  @ApiProperty({
    description: 'Recent assessments',
  })
  recentAssessments: any[];
}