import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsBoolean, IsUrl, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrganizationSize {
  MICRO = 'MICRO',
  SMALL = 'SMALL', 
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  ENTERPRISE = 'ENTERPRISE',
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
  OTHER = 'OTHER',
}

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'ACME Corporation',
  })
  @IsString({ message: 'Organization name must be a string' })
  @IsNotEmpty({ message: 'Organization name is required' })
  name: string;

  @ApiPropertyOptional({
    description: 'Organization email',
    example: 'contact@acme.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid organization email' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Organization phone number',
    example: '+1-555-0123',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Organization website',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid website URL' })
  website?: string;

  @ApiProperty({
    description: 'Organization sector',
    enum: Sector,
    example: Sector.TECHNOLOGY,
  })
  @IsEnum(Sector, { message: 'Please provide a valid sector' })
  sector: Sector;

  @ApiProperty({
    description: 'Organization size',
    enum: OrganizationSize,
    example: OrganizationSize.MEDIUM,
  })
  @IsEnum(OrganizationSize, { message: 'Please provide a valid organization size' })
  size: OrganizationSize;

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'Leading technology solutions provider',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether organization is publicly visible',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic?: boolean;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Organization name',
    example: 'ACME Corporation Ltd',
  })
  @IsOptional()
  @IsString({ message: 'Organization name must be a string' })
  @IsNotEmpty({ message: 'Organization name cannot be empty' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Organization email',
    example: 'info@acme.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid organization email' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Organization phone number',
    example: '+1-555-0123',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Organization website',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid website URL' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Organization sector',
    enum: Sector,
    example: Sector.TECHNOLOGY,
  })
  @IsOptional()
  @IsEnum(Sector, { message: 'Please provide a valid sector' })
  sector?: Sector;

  @ApiPropertyOptional({
    description: 'Organization size',
    enum: OrganizationSize,
    example: OrganizationSize.MEDIUM,
  })
  @IsOptional()
  @IsEnum(OrganizationSize, { message: 'Please provide a valid organization size' })
  size?: OrganizationSize;

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether organization is publicly visible',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic?: boolean;
}

export class JoinOrganizationDto {
  @ApiPropertyOptional({
    description: 'Organization invite code',
    example: 'INV-ABC123XYZ',
  })
  @IsOptional()
  @IsString({ message: 'Invite code must be a string' })
  @IsNotEmpty({ message: 'Invite code cannot be empty' })
  inviteCode?: string;

  @ApiPropertyOptional({
    description: 'Organization ID to join',
    example: 'org_12345',
  })
  @IsOptional()
  @IsString({ message: 'Organization ID must be a string' })
  @IsNotEmpty({ message: 'Organization ID cannot be empty' })
  organizationId?: string;
}

export class CreateInviteCodeDto {
  @ApiPropertyOptional({
    description: 'Number of days until expiration',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @IsInt({ message: 'Expiration days must be an integer' })
  @Min(1, { message: 'Expiration days must be at least 1' })
  @Max(365, { message: 'Expiration days cannot exceed 365' })
  expirationDays?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of times the code can be used',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt({ message: 'Usage limit must be an integer' })
  @Min(1, { message: 'Usage limit must be at least 1' })
  @Max(1000, { message: 'Usage limit cannot exceed 1000' })
  usageLimit?: number;
}

export class OrganizationQueryDto {
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
    description: 'Search term for organization name',
    example: 'tech',
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by sector',
    enum: Sector,
    example: Sector.TECHNOLOGY,
  })
  @IsOptional()
  @IsEnum(Sector, { message: 'Please provide a valid sector' })
  sector?: Sector;

  @ApiPropertyOptional({
    description: 'Filter by organization size',
    enum: OrganizationSize,
    example: OrganizationSize.MEDIUM,
  })
  @IsOptional()
  @IsEnum(OrganizationSize, { message: 'Please provide a valid organization size' })
  size?: OrganizationSize;

  @ApiPropertyOptional({
    description: 'Filter by public visibility',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic?: boolean;
}