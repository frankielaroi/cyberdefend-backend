import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsEmail,
  IsUrl,
  IsDateString,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

// Enums
export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED', 
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CampaignCategory {
  SECURITY = 'Security',
  HR = 'HR',
  FINANCE = 'Finance',
  IT = 'IT',
  EXECUTIVE = 'Executive',
}



export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  VERY_HIGH = 'Very High',
}

export enum LaunchType {
  NOW = 'NOW',
  SCHEDULED = 'SCHEDULED',
}

export enum CampaignEvent {
  EMAIL_SENT = 'email_sent',
  EMAIL_DELIVERED = 'email_delivered',
  EMAIL_OPENED = 'email_opened',
  LINK_CLICKED = 'link_clicked',
  CREDENTIALS_ENTERED = 'credentials_entered',
  PHISHING_REPORTED = 'phishing_reported',
  EMAIL_BOUNCED = 'email_bounced',
}

export enum SortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  LAUNCHED_AT = 'launchedAt',
  STATUS = 'status',
  COMPLETION_RATE = 'completionRate',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

// DTOs
export class CampaignTargetDto {
  @ApiProperty({
    description: 'Target email address',
    example: 'john.doe@company.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiPropertyOptional({
    description: 'Target first name',
    example: 'John',
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Target last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Target department',
    example: 'Marketing',
  })
  @IsOptional()
  @IsString({ message: 'Department must be a string' })
  department?: string;

  @ApiPropertyOptional({
    description: 'Target job title',
    example: 'Marketing Manager',
  })
  @IsOptional()
  @IsString({ message: 'Job title must be a string' })
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'User ID if target is a system user',
    example: 'user_123456789',
  })
  @IsOptional()
  @IsString({ message: 'User ID must be a string' })
  userId?: string;
}

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Campaign name',
    example: 'Q4 Security Awareness Test',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiPropertyOptional({
    description: 'Campaign description',
    example: 'Quarterly phishing simulation for all employees',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({
    description: 'Campaign template ID',
    example: 'PASSWORD_RESET',
  })
  @IsString({ message: 'Template must be a string' })
  @IsNotEmpty({ message: 'Template is required' })
  templateId: string;

  @ApiProperty({
    description: 'Email subject line',
    example: 'Urgent: Password Reset Required',
  })
  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  subject: string;

  @ApiProperty({
    description: 'Sender name',
    example: 'IT Security Team',
  })
  @IsString({ message: 'Sender name must be a string' })
  @IsNotEmpty({ message: 'Sender name is required' })
  senderName: string;

  @ApiProperty({
    description: 'Sender email address',
    example: 'security@company.com',
  })
  @IsEmail({}, { message: 'Please provide a valid sender email address' })
  @IsNotEmpty({ message: 'Sender email is required' })
  senderEmail: string;

  @ApiPropertyOptional({
    description: 'Landing page URL',
    example: 'https://phishing-test.company.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid landing page URL' })
  landingPageUrl?: string;

  @ApiProperty({
    description: 'Campaign targets',
    type: [CampaignTargetDto],
  })
  @IsArray({ message: 'Targets must be an array' })
  @ArrayMinSize(1, { message: 'At least one target is required' })
  @ValidateNested({ each: true })
  @Type(() => CampaignTargetDto)
  targets: CampaignTargetDto[];

  @ApiPropertyOptional({
    description: 'Scheduled launch time (ISO 8601)',
    example: '2025-10-15T09:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid ISO 8601 date string' })
  @Transform(({ value }) => {
    if (!value) return value;
    // Ensure proper ISO-8601 format
    let dateString = value;
    if (typeof dateString === 'string') {
      // Add seconds if missing
      if (!dateString.includes(':') || dateString.split(':').length < 3) {
        dateString = dateString.includes('T') ? dateString + ':00' : dateString;
      }
      // Add UTC timezone if missing
      if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
        dateString = dateString + 'Z';
      }
    }
    return dateString;
  })
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Organization ID (will be set from user context if not provided)',
    example: 'org_123456789',
  })
  @IsOptional()
  @IsString({ message: 'Organization ID must be a string' })
  organizationId?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({
    description: 'Campaign name',
    example: 'Q4 Security Awareness Test - Updated',
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Campaign description',
    example: 'Updated quarterly phishing simulation',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Email subject line',
    example: 'Updated: Password Reset Required',
  })
  @IsOptional()
  @IsString({ message: 'Subject must be a string' })
  subject?: string;

  @ApiPropertyOptional({
    description: 'Sender name',
    example: 'IT Security Team',
  })
  @IsOptional()
  @IsString({ message: 'Sender name must be a string' })
  senderName?: string;

  @ApiPropertyOptional({
    description: 'Sender email address',
    example: 'security@company.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid sender email address' })
  senderEmail?: string;

  @ApiPropertyOptional({
    description: 'Landing page URL',
    example: 'https://phishing-test.company.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid landing page URL' })
  landingPageUrl?: string;

  @ApiPropertyOptional({
    description: 'Scheduled launch time (ISO 8601)',
    example: '2025-10-15T09:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid ISO 8601 date string' })
  scheduledAt?: string;
}

export class LaunchCampaignDto {
  @ApiProperty({
    description: 'Campaign ID to launch',
    example: 'camp_123456789',
  })
  @IsString({ message: 'Campaign ID must be a string' })
  @IsNotEmpty({ message: 'Campaign ID is required' })
  campaignId: string;

  @ApiProperty({
    description: 'Launch type',
    enum: LaunchType,
    example: LaunchType.NOW,
  })
  @IsEnum(LaunchType, { message: 'Launch type must be NOW or SCHEDULED' })
  launchType: LaunchType;

  @ApiPropertyOptional({
    description: 'Scheduled launch time (required if launchType is SCHEDULED)',
    example: '2025-10-15T09:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid ISO 8601 date string' })
  scheduledAt?: string;
}

export class CampaignQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by campaign status',
    enum: CampaignStatus,
    example: CampaignStatus.RUNNING,
  })
  @IsOptional()
  @IsEnum(CampaignStatus, { message: 'Please provide a valid campaign status' })
  status?: CampaignStatus;

  @ApiPropertyOptional({
    description: 'Search term for campaign name or description',
    example: 'security awareness',
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: SortField,
    example: SortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortField, { message: 'Please provide a valid sort field' })
  sortBy?: SortField;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Please provide a valid sort order' })
  sortOrder?: SortOrder;

  @ApiPropertyOptional({
    description: 'Filter by template category',
    enum: CampaignCategory,
    example: CampaignCategory.SECURITY,
  })
  @IsOptional()
  @IsEnum(CampaignCategory, { message: 'Please provide a valid category' })
  category?: CampaignCategory;

  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid ISO 8601 date string' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid ISO 8601 date string' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by template ID',
    example: 'template_123456789',
  })
  @IsOptional()
  @IsString({ message: 'Template ID must be a string' })
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Filter by creator user ID',
    example: 'user_123456789',
  })
  @IsOptional()
  @IsString({ message: 'Creator ID must be a string' })
  createdBy?: string;
}

export class CampaignTargetStatsDto {
  @ApiProperty({ description: 'Target ID', example: 'target_123' })
  id: string;

  @ApiProperty({ description: 'Email address', example: 'john.doe@company.com' })
  email: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName?: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName?: string;

  @ApiProperty({ description: 'Department', example: 'Marketing' })
  department?: string;

  @ApiProperty({ description: 'Email sent status', example: true })
  emailSent: boolean;

  @ApiProperty({ description: 'Email delivered status', example: true })
  emailDelivered: boolean;

  @ApiProperty({ description: 'Email opened status', example: false })
  emailOpened: boolean;

  @ApiProperty({ description: 'Link clicked status', example: false })
  linkClicked: boolean;

  @ApiProperty({ description: 'Credentials entered status', example: false })
  credentialsEntered: boolean;

  @ApiProperty({ description: 'Phishing reported status', example: true })
  reportedPhishing: boolean;

  @ApiProperty({ description: 'Email sent timestamp', example: '2025-10-07T09:00:00Z' })
  sentAt?: string;

  @ApiProperty({ description: 'Email delivered timestamp', example: '2025-10-07T09:01:00Z' })
  deliveredAt?: string;

  @ApiProperty({ description: 'Email opened timestamp', example: '2025-10-07T09:15:00Z' })
  openedAt?: string;

  @ApiProperty({ description: 'Link clicked timestamp', example: '2025-10-07T09:30:00Z' })
  clickedAt?: string;

  @ApiProperty({ description: 'Credentials entered timestamp' })
  credentialsAt?: string;

  @ApiProperty({ description: 'Phishing reported timestamp', example: '2025-10-07T10:00:00Z' })
  reportedAt?: string;
}

export class CampaignOverviewDto {
  @ApiProperty({ description: 'Total number of targets', example: 150 })
  totalTargets: number;

  @ApiProperty({ description: 'Number of emails sent', example: 148 })
  emailsSent: number;

  @ApiProperty({ description: 'Number of emails delivered', example: 145 })
  emailsDelivered: number;

  @ApiProperty({ description: 'Number of emails opened', example: 89 })
  emailsOpened: number;

  @ApiProperty({ description: 'Number of links clicked', example: 23 })
  linksClicked: number;

  @ApiProperty({ description: 'Number of credentials entered', example: 8 })
  credentialsEntered: number;

  @ApiProperty({ description: 'Number of users who reported phishing', example: 12 })
  usersReported: number;

  @ApiProperty({ description: 'Number of bounced emails', example: 3 })
  emailsBounced: number;
}

export class CampaignMetricsDto {
  @ApiProperty({ description: 'Email delivery rate percentage', example: 97.97 })
  deliveryRate: number;

  @ApiProperty({ description: 'Email open rate percentage', example: 61.38 })
  openRate: number;

  @ApiProperty({ description: 'Link click rate percentage', example: 15.86 })
  clickRate: number;

  @ApiProperty({ description: 'Credential entry rate percentage', example: 5.52 })
  credentialRate: number;

  @ApiProperty({ description: 'Phishing report rate percentage', example: 8.28 })
  reportRate: number;

  @ApiProperty({ description: 'Email bounce rate percentage', example: 2.03 })
  bounceRate: number;
}

export class CampaignResultsDto {
  @ApiProperty({ description: 'Campaign ID', example: 'camp_123456789' })
  campaignId: string;

  @ApiProperty({ description: 'Campaign overview statistics' })
  overview: CampaignOverviewDto;

  @ApiProperty({ description: 'Campaign performance metrics' })
  metrics: CampaignMetricsDto;

  @ApiProperty({ description: 'Individual target results', type: [CampaignTargetStatsDto] })
  targets: CampaignTargetStatsDto[];
}

export class TimelineEventDto {
  @ApiProperty({ description: 'Event timestamp', example: '2025-10-07T09:00:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'Event type', enum: CampaignEvent })
  event: CampaignEvent;

  @ApiProperty({ description: 'Number of events', example: 50 })
  count: number;

  @ApiPropertyOptional({ description: 'Target email (for individual events)', example: 'john.doe@company.com' })
  targetEmail?: string;

  @ApiPropertyOptional({ description: 'Additional event metadata' })
  metadata?: Record<string, any>;
}

export class DepartmentStatsDto {
  @ApiProperty({ description: 'Department name', example: 'Marketing' })
  name: string;

  @ApiProperty({ description: 'Total users in department', example: 25 })
  totalUsers: number;

  @ApiProperty({ description: 'Click rate percentage', example: 12.0 })
  clickRate: number;

  @ApiProperty({ description: 'Report rate percentage', example: 20.0 })
  reportRate: number;

  @ApiProperty({ description: 'Credential entry rate percentage', example: 4.0 })
  credentialRate: number;

  @ApiProperty({ description: 'Department risk score (0-10)', example: 7.2 })
  riskScore: number;
}

export class HighRiskUserDto {
  @ApiProperty({ description: 'User email', example: 'vulnerable.user@company.com' })
  email: string;

  @ApiProperty({ description: 'User risk score (0-10)', example: 9.2 })
  riskScore: number;

  @ApiProperty({ description: 'Risk reasoning', example: 'Clicked link and entered credentials' })
  reasoning: string;

  @ApiPropertyOptional({ description: 'User department', example: 'Finance' })
  department?: string;

  @ApiPropertyOptional({ description: 'User name', example: 'John Doe' })
  name?: string;
}

// Risk Metrics DTO
export class RiskMetricsDto {
  @ApiProperty({ description: 'Overall risk score', example: 6.5 })
  overallScore: number;

  @ApiProperty({ description: 'Email delivery rate percentage', example: 97.3 })
  deliveryRate: number;

  @ApiProperty({ description: 'Email open rate percentage', example: 78.9 })
  openRate: number;

  @ApiProperty({ description: 'Link click rate percentage', example: 42.1 })
  clickRate: number;

  @ApiProperty({ description: 'Credential entry rate percentage', example: 15.8 })
  credentialRate: number;

  @ApiProperty({ description: 'Phishing report rate percentage', example: 36.8 })
  reportRate: number;
}

export class CampaignAnalyticsDto {
  @ApiProperty({ description: 'Campaign ID', example: 'camp_123456789' })
  campaignId: string;

  @ApiProperty({ description: 'Campaign overview statistics' })
  overview: CampaignOverviewDto;

  @ApiProperty({ description: 'Campaign timeline events', type: [TimelineEventDto] })
  timeline: TimelineEventDto[];

  @ApiProperty({ description: 'Individual user performance', type: [CampaignTargetStatsDto] })
  userPerformance: CampaignTargetStatsDto[];

  @ApiProperty({ description: 'Department-wise statistics', type: [DepartmentStatsDto] })
  departments: DepartmentStatsDto[];

  @ApiProperty({ description: 'Risk assessment metrics' })
  riskMetrics: RiskMetricsDto;
}

export class TemplateDto {
  @ApiProperty({ description: 'Template ID', example: 'PASSWORD_RESET' })
  id: string;

  @ApiProperty({ description: 'Template name', example: 'Password Reset Alert' })
  name: string;

  @ApiProperty({ description: 'Template description', example: 'Account security alert requiring immediate password reset' })
  description: string;

  @ApiProperty({ description: 'Template category', enum: CampaignCategory })
  category: CampaignCategory;

  @ApiProperty({ description: 'Risk level', enum: RiskLevel })
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Default email subject', example: 'Urgent: Password Reset Required' })
  defaultSubject: string;

  @ApiProperty({ description: 'Default sender name', example: 'IT Security Team' })
  defaultSenderName: string;

  @ApiProperty({ description: 'Email body HTML content' })
  emailBodyHtml: string;

  @ApiProperty({ description: 'Email body text content' })
  emailBodyText: string;

  @ApiPropertyOptional({ description: 'Landing page HTML content' })
  landingPageHtml?: string;

  @ApiProperty({ description: 'Whether template captures credentials', example: false })
  captureCredentials: boolean;

  @ApiProperty({ description: 'Template preview content', example: 'Your account security may be compromised...' })
  previewContent: string;

  @ApiProperty({ description: 'Template tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Template active status', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp', example: '2025-01-01T00:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp', example: '2025-01-01T00:00:00Z' })
  updatedAt: string;
}

export class ExportCampaignDto {
  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    example: ExportFormat.EXCEL,
  })
  @IsEnum(ExportFormat, { message: 'Please provide a valid export format' })
  format: ExportFormat;

  @ApiPropertyOptional({
    description: 'Start date for export range',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid start date' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for export range',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid end date' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Include detailed target data',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include details must be a boolean' })
  includeDetails?: boolean;

  @ApiPropertyOptional({
    description: 'Campaign IDs to include (if not provided, includes all)',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Campaign IDs must be an array' })
  @IsString({ each: true, message: 'Each campaign ID must be a string' })
  campaignIds?: string[];
}

export class LiveStatsDto {
  @ApiProperty({ description: 'Campaign ID', example: 'camp_123456789' })
  campaignId: string;

  @ApiProperty({ description: 'Campaign status', enum: CampaignStatus })
  status: CampaignStatus;

  @ApiProperty({ description: 'Real-time overview statistics' })
  overview: CampaignOverviewDto;

  @ApiProperty({ description: 'Real-time performance metrics' })
  metrics: CampaignMetricsDto;

  @ApiProperty({ description: 'Last update timestamp', example: '2025-10-07T10:30:00Z' })
  lastUpdated: string;

  @ApiProperty({ description: 'Recent events (last 10)', type: [TimelineEventDto] })
  recentEvents: TimelineEventDto[];
}

// Bulk Targets DTO
export class BulkTargetsDto {
  @ApiProperty({ description: 'List of targets to add', type: [CampaignTargetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignTargetDto)
  targets: CampaignTargetDto[];
}

// Campaign Export DTO
export class CampaignExportDto {
  @ApiProperty({ enum: ['CSV', 'PDF'], description: 'Export format' })
  @IsEnum(['CSV', 'PDF'])
  format: 'CSV' | 'PDF';

  @ApiPropertyOptional({ description: 'Include detailed target data' })
  @IsOptional()
  @IsBoolean()
  includeTargets?: boolean;

  @ApiPropertyOptional({ description: 'Include analytics data' })
  @IsOptional()
  @IsBoolean()
  includeAnalytics?: boolean;
}

// Campaign Webhook DTO (updated)
export class CampaignWebhookDto {
  @ApiProperty({ description: 'Webhook URL' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Events to trigger webhook', type: [String] })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({ description: 'Webhook secret for verification' })
  @IsOptional()
  @IsString()
  secret?: string;
}

// Department Analytics DTO
export class DepartmentAnalyticsDto {
  @ApiProperty({ description: 'Department name', example: 'Marketing' })
  department: string;

  @ApiProperty({ description: 'Total employees in department', example: 25 })
  totalEmployees: number;

  @ApiProperty({ description: 'Number of targets in campaign', example: 20 })
  targetCount: number;

  @ApiProperty({ description: 'Number of emails delivered', example: 19 })
  emailsDelivered: number;

  @ApiProperty({ description: 'Number of emails opened', example: 15 })
  emailsOpened: number;

  @ApiProperty({ description: 'Number of links clicked', example: 8 })
  linksClicked: number;

  @ApiProperty({ description: 'Number of credentials entered', example: 3 })
  credentialsEntered: number;

  @ApiProperty({ description: 'Number of phishing reports', example: 7 })
  phishingReported: number;

  @ApiProperty({ description: 'Department open rate percentage', example: 78.9 })
  openRate: number;

  @ApiProperty({ description: 'Department click rate percentage', example: 42.1 })
  clickRate: number;

  @ApiProperty({ description: 'Department credential rate percentage', example: 15.8 })
  credentialRate: number;

  @ApiProperty({ description: 'Department report rate percentage', example: 36.8 })
  reportRate: number;

  @ApiProperty({ description: 'Department risk score', example: 7.2 })
  riskScore: number;
}

// Tracking Event DTO
export class TrackingEventDto {
  @ApiProperty({ description: 'Event type' })
  type: string;

  @ApiProperty({ description: 'Target ID' })
  targetId: string;

  @ApiPropertyOptional({ description: 'User agent' })
  userAgent?: string;

  @ApiPropertyOptional({ description: 'IP address' })
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}