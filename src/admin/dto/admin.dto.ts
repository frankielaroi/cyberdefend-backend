import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsArray, IsNumber, IsBoolean, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma';

// Admin User Management DTOs
export class CreateUserDto {
  @IsEmail()
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John' })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @IsEnum(UserRole)
  @ApiProperty({ enum: UserRole, example: UserRole.END_USER })
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'organization-id' })
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'password123' })
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({ example: 'John' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  @ApiPropertyOptional({ enum: UserRole, example: UserRole.END_USER })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}

// Question Option DTO (moved before CreateQuestionDto)
export class QuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Option text' })
  text: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'option-value' })
  value: string;

  @IsNumber()
  @ApiProperty({ example: 1 })
  score: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false })
  isCorrect?: boolean;
}

// Question Management DTOs
export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'What is the primary purpose of encryption?' })
  text: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'This question assesses understanding of encryption principles' })
  description?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'multiple_choice' })
  type: string;

  @IsNumber()
  @ApiProperty({ example: 1 })
  weight: number;

  @IsBoolean()
  @ApiProperty({ example: true })
  isRequired: boolean;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'category-id' })
  categoryId: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '1.0' })
  version?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @ApiProperty({ type: [QuestionOptionDto] })
  options: QuestionOptionDto[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Updated question text' })
  text?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Updated description' })
  description?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'single_choice' })
  type?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 2 })
  weight?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false })
  isRequired?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'updated-category-id' })
  categoryId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '1.1' })
  version?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @ApiPropertyOptional({ type: [QuestionOptionDto] })
  options?: QuestionOptionDto[];
}

export class ArchiveQuestionDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Question no longer relevant' })
  reason?: string;
}

// Detection Rule Condition DTO
export class DetectionRuleConditionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'source_ip' })
  field: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'equals' })
  operator: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '192.168.1.100' })
  value: string;
}

// Detection Rules Management DTOs
export class CreateDetectionRuleDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Suspicious Login Rule' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Detects suspicious login attempts from unknown IPs' })
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetectionRuleConditionDto)
  @ApiProperty({ type: [DetectionRuleConditionDto] })
  conditions: DetectionRuleConditionDto[];

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'HIGH' })
  severity: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'ALERT' })
  action: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}

export class UpdateDetectionRuleDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Updated Rule Name' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Updated description' })
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetectionRuleConditionDto)
  @ApiPropertyOptional({ type: [DetectionRuleConditionDto] })
  conditions?: DetectionRuleConditionDto[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'MEDIUM' })
  severity?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'BLOCK' })
  action?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false })
  isActive?: boolean;
}

export class TestDetectionRuleDto {
  @ValidateNested()
  @Type(() => CreateDetectionRuleDto)
  @ApiProperty({ type: CreateDetectionRuleDto })
  detectionRule: CreateDetectionRuleDto;

  @IsArray()
  @ApiProperty({ 
    example: [
      { source_ip: '192.168.1.100', user_agent: 'Chrome/91.0', timestamp: '2023-01-01T12:00:00Z' },
      { source_ip: '10.0.0.1', user_agent: 'Firefox/89.0', timestamp: '2023-01-01T12:05:00Z' }
    ]
  })
  sampleData: Record<string, any>[];
}