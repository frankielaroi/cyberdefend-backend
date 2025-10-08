import { IsString, IsOptional, IsEnum, IsNotEmpty, IsDateString, IsArray, ValidateNested, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PhishingTargetDto {
  @ApiProperty({
    description: 'Target email address',
    example: 'john.doe@company.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Target first name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Target last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Target department',
    example: 'Engineering',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Target user ID if linked to a user account',
    example: 'user-uuid',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Campaign name',
    example: 'Q4 Security Awareness Training',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Campaign description',
    example: 'Quarterly phishing simulation for all employees',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Template ID to use for the campaign',
    example: 'template-uuid',
  })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({
    description: 'Email template to use',
    enum: ['HR_UPDATE', 'PASSWORD_RESET', 'IT_SECURITY', 'BANK_ALERT', 'SHIPPING_NOTICE', 'CUSTOM'],
    example: 'PASSWORD_RESET',
  })
  @IsEnum(['HR_UPDATE', 'PASSWORD_RESET', 'IT_SECURITY', 'BANK_ALERT', 'SHIPPING_NOTICE', 'CUSTOM'])
  template: string;

  @ApiProperty({
    description: 'Email subject line',
    example: 'Urgent: Password Reset Required',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Sender name',
    example: 'IT Security Team',
  })
  @IsString()
  @IsNotEmpty()
  senderName: string;

  @ApiProperty({
    description: 'Sender email address',
    example: 'security@company.com',
  })
  @IsEmail()
  @IsNotEmpty()
  senderEmail: string;

  @ApiPropertyOptional({
    description: 'Landing page URL for the phishing simulation',
    example: 'https://secure.phishingsim.com/landing/abc123',
  })
  @IsOptional()
  @IsUrl()
  landingPageUrl?: string;

  @ApiPropertyOptional({
    description: 'Schedule campaign for later (ISO date string)',
    example: '2024-10-15T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({
    description: 'Target list for the campaign',
    type: [PhishingTargetDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhishingTargetDto)
  targets: PhishingTargetDto[];
}

export class LaunchCampaignDto {
  @ApiProperty({
    description: 'Campaign ID to launch',
    example: 'campaign-uuid',
  })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiPropertyOptional({
    description: 'Launch immediately or schedule for later',
    enum: ['NOW', 'SCHEDULED'],
    example: 'NOW',
  })
  @IsOptional()
  @IsEnum(['NOW', 'SCHEDULED'])
  launchType?: string;

  @ApiPropertyOptional({
    description: 'Schedule time if launchType is SCHEDULED',
    example: '2024-10-15T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({
    description: 'Campaign name',
    example: 'Updated Campaign Name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Campaign description',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Email subject line',
    example: 'Updated subject',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Campaign status',
    enum: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
    example: 'PAUSED',
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'])
  status?: string;
}