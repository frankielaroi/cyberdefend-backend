import { IsString, IsEmail, IsOptional, IsArray, IsDateString, IsEnum, IsNumber, Min, Max, IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmailAttachmentDto {
  @ApiProperty({ description: 'Filename of the attachment' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Content of the attachment (base64 encoded)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Content type of the attachment' })
  @IsString()
  @IsOptional()
  contentType?: string;
}

export class SendEmailDto {
  @ApiProperty({ 
    description: 'Email recipient(s)', 
    example: 'user@example.com',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } }
    ]
  })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  @IsArray()
  @IsEmail({}, { each: true })
  to: string[];

  @ApiProperty({ description: 'Email subject', example: 'Welcome to CyberDefend' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: 'HTML content' })
  @IsString()
  @IsOptional()
  htmlContent?: string;

  @ApiPropertyOptional({ description: 'Text content' })
  @IsString()
  @IsOptional()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Email category for tracking', default: 'CyberDefend Notification' })
  @IsString()
  @IsOptional()
  category?: string = 'CyberDefend Notification';

  @ApiPropertyOptional({ description: 'Custom sender email for this campaign' })
  @IsEmail()
  @IsOptional()
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'Custom sender name for this campaign' })
  @IsString()
  @IsOptional()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Email attachments', type: [EmailAttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  @IsOptional()
  attachments?: EmailAttachmentDto[];
}

export class SendSmsDto {
  @ApiProperty({ 
    description: 'SMS recipient(s)', 
    example: '+1234567890',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } }
    ]
  })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  @IsArray()
  @IsString({ each: true })
  to: string[];

  @ApiProperty({ description: 'SMS message content', example: 'Your verification code is 123456' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Custom sender ID for this campaign (overrides default)' })
  @IsString()
  @IsOptional()
  from?: string;
}

export class BulkEmailDto {
  @ApiProperty({ 
    description: 'Email recipients', 
    example: ['user1@example.com', 'user2@example.com']
  })
  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @ApiProperty({ description: 'Email subject', example: 'Important Update' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Email content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Whether content is HTML', default: false })
  @IsBoolean()
  @IsOptional()
  isHtml?: boolean = false;

  @ApiPropertyOptional({ description: 'Email category for tracking', default: 'Bulk Email' })
  @IsString()
  @IsOptional()
  category?: string = 'Bulk Email';

  @ApiPropertyOptional({ description: 'Custom sender email for this campaign' })
  @IsEmail()
  @IsOptional()
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'Custom sender name for this campaign' })
  @IsString()
  @IsOptional()
  fromName?: string;
}

export class RepeatOptionsDto {
  @ApiPropertyOptional({ description: 'Repeat every X milliseconds', minimum: 1000 })
  @IsNumber()
  @Min(1000)
  @IsOptional()
  every?: number;

  @ApiPropertyOptional({ description: 'Maximum number of repetitions', minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'End date for repetitions' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class ScheduleOptionsDto {
  @ApiPropertyOptional({ description: 'Delay in milliseconds before sending', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  delay?: number;

  @ApiPropertyOptional({ description: 'Cron expression for scheduling', example: '0 9 * * MON-FRI' })
  @IsString()
  @IsOptional()
  cron?: string;

  @ApiPropertyOptional({ description: 'Repeat options', type: RepeatOptionsDto })
  @ValidateNested()
  @Type(() => RepeatOptionsDto)
  @IsOptional()
  repeat?: RepeatOptionsDto;
}

export class RetryOptionsDto {
  @ApiPropertyOptional({ description: 'Maximum retry attempts', minimum: 0, maximum: 10, default: 3 })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  attempts?: number = 3;

  @ApiPropertyOptional({ description: 'Delay between retries in milliseconds', minimum: 1000, default: 5000 })
  @IsNumber()
  @Min(1000)
  @IsOptional()
  delay?: number = 5000;

  @ApiPropertyOptional({ description: 'Use exponential backoff for retries', default: true })
  @IsBoolean()
  @IsOptional()
  exponentialBackoff?: boolean = true;
}

export class ScheduleEmailDto extends SendEmailDto {
  @ApiPropertyOptional({ description: 'Schedule options', type: ScheduleOptionsDto })
  @ValidateNested()
  @Type(() => ScheduleOptionsDto)
  @IsOptional()
  schedule?: ScheduleOptionsDto;

  @ApiPropertyOptional({ description: 'Retry options', type: RetryOptionsDto })
  @ValidateNested()
  @Type(() => RetryOptionsDto)
  @IsOptional()
  retryOptions?: RetryOptionsDto;

  @ApiPropertyOptional({ description: 'Job priority', enum: ['low', 'normal', 'high', 'critical'], default: 'normal' })
  @IsEnum(['low', 'normal', 'high', 'critical'])
  @IsOptional()
  priority?: 'low' | 'normal' | 'high' | 'critical' = 'normal';

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ScheduleSmsDto extends SendSmsDto {
  @ApiPropertyOptional({ description: 'Schedule options', type: ScheduleOptionsDto })
  @ValidateNested()
  @Type(() => ScheduleOptionsDto)
  @IsOptional()
  schedule?: ScheduleOptionsDto;

  @ApiPropertyOptional({ description: 'Retry options', type: RetryOptionsDto })
  @ValidateNested()
  @Type(() => RetryOptionsDto)
  @IsOptional()
  retryOptions?: RetryOptionsDto;

  @ApiPropertyOptional({ description: 'Job priority', enum: ['low', 'normal', 'high', 'critical'], default: 'normal' })
  @IsEnum(['low', 'normal', 'high', 'critical'])
  @IsOptional()
  priority?: 'low' | 'normal' | 'high' | 'critical' = 'normal';

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class NotificationStatusDto {
  @ApiProperty({ description: 'Notification ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Notification type', enum: ['email', 'sms'] })
  @IsEnum(['email', 'sms'])
  type: 'email' | 'sms';

  @ApiProperty({ description: 'Current status', enum: ['pending', 'sent', 'failed', 'retry'] })
  @IsEnum(['pending', 'sent', 'failed', 'retry'])
  status: 'pending' | 'sent' | 'failed' | 'retry';

  @ApiProperty({ description: 'Recipient' })
  @IsString()
  recipient: string;

  @ApiPropertyOptional({ description: 'Subject (for emails)' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ description: 'Number of attempts' })
  @IsNumber()
  attempts: number;

  @ApiPropertyOptional({ description: 'Last attempt timestamp' })
  @IsDateString()
  @IsOptional()
  lastAttempt?: string;

  @ApiPropertyOptional({ description: 'Sent timestamp' })
  @IsDateString()
  @IsOptional()
  sentAt?: string;

  @ApiPropertyOptional({ description: 'Error message' })
  @IsString()
  @IsOptional()
  error?: string;

  @ApiProperty({ description: 'Created timestamp' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  @IsDateString()
  updatedAt: string;
}