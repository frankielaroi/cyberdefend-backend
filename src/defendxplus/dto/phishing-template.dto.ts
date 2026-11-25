import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Enum definitions (will be replaced with Prisma enums after generation)
export enum TemplateCategory {
  SECURITY = 'SECURITY',
  HR = 'HR', 
  FINANCE = 'FINANCE',
  IT = 'IT',
  EXECUTIVE = 'EXECUTIVE',
  GENERAL = 'GENERAL'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

// Create Template DTO
export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name (must be unique)' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Template description' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ enum: TemplateCategory, description: 'Template category' })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ enum: RiskLevel, description: 'Risk level of the template' })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Default email subject line' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  defaultSubject: string;

  @ApiProperty({ description: 'Default sender name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  defaultSenderName: string;

  @ApiProperty({ description: 'Email body HTML content' })
  @IsString()
  @MinLength(50)
  emailBodyHtml: string;

  @ApiProperty({ description: 'Email body plain text version' })
  @IsString()
  @MinLength(20)
  emailBodyText: string;

  @ApiPropertyOptional({ description: 'Landing page HTML content' })
  @IsOptional()
  @IsString()
  landingPageHtml?: string;

  @ApiPropertyOptional({ description: 'Whether template captures credentials', default: false })
  @IsOptional()
  @IsBoolean()
  captureCredentials?: boolean;

  @ApiProperty({ description: 'Short preview text for template selection' })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  previewContent: string;

  @ApiPropertyOptional({ description: 'Template tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Update Template DTO
export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: TemplateCategory, description: 'Template category' })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ enum: RiskLevel, description: 'Risk level of the template' })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: 'Default email subject line' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  defaultSubject?: string;

  @ApiPropertyOptional({ description: 'Default sender name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  defaultSenderName?: string;

  @ApiPropertyOptional({ description: 'Email body HTML content' })
  @IsOptional()
  @IsString()
  @MinLength(50)
  emailBodyHtml?: string;

  @ApiPropertyOptional({ description: 'Email body plain text version' })
  @IsOptional()
  @IsString()
  @MinLength(20)
  emailBodyText?: string;

  @ApiPropertyOptional({ description: 'Landing page HTML content' })
  @IsOptional()
  @IsString()
  landingPageHtml?: string;

  @ApiPropertyOptional({ description: 'Whether template captures credentials' })
  @IsOptional()
  @IsBoolean()
  captureCredentials?: boolean;

  @ApiPropertyOptional({ description: 'Whether template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Short preview text for template selection' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  previewContent?: string;

  @ApiPropertyOptional({ description: 'Template tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Template Query DTO
export class TemplateQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: TemplateCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ enum: RiskLevel, description: 'Filter by risk level' })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: 'Search term for name, description, or tags' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Field to sort by', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Filter by active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Template Preview DTO
export class TemplatePreviewDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiProperty({ description: 'Template description' })
  description: string;

  @ApiProperty({ enum: TemplateCategory, description: 'Template category' })
  category: TemplateCategory;

  @ApiProperty({ enum: RiskLevel, description: 'Risk level' })
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Default email subject' })
  defaultSubject: string;

  @ApiProperty({ description: 'Default sender name' })
  defaultSenderName: string;

  @ApiProperty({ description: 'Preview content' })
  previewContent: string;

  @ApiProperty({ description: 'Sanitized email HTML for preview' })
  emailBodyHtml: string;

  @ApiPropertyOptional({ description: 'Sanitized landing page HTML for preview' })
  landingPageHtml?: string;

  @ApiProperty({ description: 'Whether template captures credentials' })
  captureCredentials: boolean;

  @ApiProperty({ description: 'Template tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Number of times template has been used' })
  usageCount: number;

  @ApiPropertyOptional({ description: 'Average success rate percentage' })
  successRate?: number;
}

// Clone Template DTO
export class CloneTemplateDto {
  @ApiProperty({ description: 'Name for the cloned template' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Optional description override' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// Template Validation Result DTO
export class TemplateValidationDto {
  @ApiProperty({ description: 'Whether template is valid' })
  isValid: boolean;

  @ApiProperty({ description: 'List of validation issues', type: [String] })
  issues: string[];
}

// Template Statistics DTO
export class TemplateStatsDto {
  @ApiProperty({ description: 'Template ID' })
  templateId: string;

  @ApiProperty({ description: 'Template name' })
  templateName: string;

  @ApiProperty({ description: 'Usage statistics' })
  usage: {
    totalCampaigns: number;
    completedCampaigns: number;
    totalTargets: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalCredentials: number;
    totalReported: number;
  };

  @ApiProperty({ description: 'Average rates across all campaigns' })
  rates: {
    avgOpenRate: number;
    avgClickRate: number;
    avgCredentialRate: number;
    avgReportRate: number;
  };

  @ApiProperty({ description: 'Campaign details using this template' })
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    targetCount: number;
    openRate: number;
    clickRate: number;
    credentialRate: number;
    createdAt: Date;
    completedAt?: Date;
  }>;
}

// Template Category Info DTO
export class TemplateCategoryDto {
  @ApiProperty({ enum: TemplateCategory, description: 'Category name' })
  category: TemplateCategory;

  @ApiProperty({ description: 'Number of templates in category' })
  count: number;

  @ApiProperty({ description: 'Category description' })
  description: string;
}