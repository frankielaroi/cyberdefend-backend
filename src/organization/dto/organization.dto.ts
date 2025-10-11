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

// Organization Settings DTOs
export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({
    description: 'Organization name',
    example: 'ACME Corporation',
  })
  @IsOptional()
  @IsString({ message: 'Organization name must be a string' })
  @IsNotEmpty({ message: 'Organization name cannot be empty' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Organization email',
    example: 'contact@acme.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid organization email' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Organization phone number',
    example: '+233-20-123-4567',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Organization website',
    example: 'https://www.acme.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid website URL' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'Leading technology company in Ghana',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Organization address',
    example: '123 Independence Avenue, Accra',
  })
  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Accra',
  })
  @IsOptional()
  @IsString({ message: 'City must be a string' })
  city?: string;

  @ApiPropertyOptional({
    description: 'Region',
    example: 'Greater Accra',
  })
  @IsOptional()
  @IsString({ message: 'Region must be a string' })
  region?: string;

  @ApiPropertyOptional({
    description: 'Ghana Post GPS Address',
    example: 'GA-123-4567',
  })
  @IsOptional()
  @IsString({ message: 'GPS address must be a string' })
  gpsAddress?: string;

  @ApiPropertyOptional({
    description: 'Organization size',
    enum: OrganizationSize,
    example: OrganizationSize.MEDIUM,
  })
  @IsOptional()
  @IsEnum(OrganizationSize, { message: 'Please provide a valid organization size' })
  size?: OrganizationSize;

  @ApiPropertyOptional({
    description: 'Organization sector',
    enum: Sector,
    example: Sector.TECHNOLOGY,
  })
  @IsOptional()
  @IsEnum(Sector, { message: 'Please provide a valid sector' })
  sector?: Sector;

  @ApiPropertyOptional({
    description: 'Whether organization should be visible in CSI Directory',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic?: boolean;
}

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'First name of the person to invite',
    example: 'John',
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the person to invite',
    example: 'Doe',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Role to assign to the invited member',
    enum: ['ORG_ADMIN', 'ORG_MANAGER', 'END_USER'],
    example: 'END_USER',
  })
  @IsOptional()
  @IsEnum(['ORG_ADMIN', 'ORG_MANAGER', 'END_USER'], { message: 'Please provide a valid role' })
  role?: string;

  @ApiPropertyOptional({
    description: 'Optional message to include in the invitation',
    example: 'Welcome to our cybersecurity team!',
  })
  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  message?: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: ['ORG_ADMIN', 'ORG_MANAGER', 'END_USER'],
    example: 'ORG_MANAGER',
  })
  @IsEnum(['ORG_ADMIN', 'ORG_MANAGER', 'END_USER'], { message: 'Please provide a valid role' })
  role: string;
}

export class RemoveMemberDto {
  @ApiPropertyOptional({
    description: 'Reason for removing the member',
    example: 'No longer with the organization',
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}

export class ResendInvitationDto {
  @ApiPropertyOptional({
    description: 'Optional message to include in the resent invitation',
    example: 'Reminder: Please join our cybersecurity platform',
  })
  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  message?: string;
}

export class OrganizationMemberResponseDto {
  @ApiProperty({ description: 'Member unique identifier' })
  id: string;

  @ApiProperty({ description: 'Member email' })
  email: string;

  @ApiProperty({ description: 'Member first name' })
  firstName: string;

  @ApiProperty({ description: 'Member last name' })
  lastName: string;

  @ApiProperty({ description: 'Member role in organization' })
  role: string;

  @ApiProperty({ description: 'Member status' })
  status: string;

  @ApiProperty({ description: 'Date member joined' })
  joinedAt: Date;

  @ApiProperty({ description: 'Last active date' })
  lastActiveAt?: Date;

  @ApiProperty({ description: 'Whether member is currently active' })
  isActive: boolean;
}

export class OrganizationSettingsResponseDto {
  @ApiProperty({ description: 'Organization unique identifier' })
  id: string;

  @ApiProperty({ description: 'Organization name' })
  name: string;

  @ApiProperty({ description: 'Organization email' })
  email?: string;

  @ApiProperty({ description: 'Organization phone' })
  phone?: string;

  @ApiProperty({ description: 'Organization website' })
  website?: string;

  @ApiProperty({ description: 'Organization description' })
  description?: string;

  @ApiProperty({ description: 'Organization logo URL' })
  logo?: string;

  @ApiProperty({ description: 'Organization address' })
  address?: string;

  @ApiProperty({ description: 'City' })
  city?: string;

  @ApiProperty({ description: 'Region' })
  region?: string;

  @ApiProperty({ description: 'GPS address' })
  gpsAddress?: string;

  @ApiProperty({ description: 'Organization size' })
  size: OrganizationSize;

  @ApiProperty({ description: 'Organization sector' })
  sector: Sector;

  @ApiProperty({ description: 'Public visibility status' })
  isPublic: boolean;

  @ApiProperty({ description: 'Organization active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Total number of members' })
  memberCount: number;

  @ApiProperty({ description: 'Date organization was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}