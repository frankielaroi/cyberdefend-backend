import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
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
    example: 'Acme Corporation',
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
    example: '+233501234567',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Organization website',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsString({ message: 'Website must be a string' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'Leading technology company specializing in cybersecurity solutions',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL',
    example: 'https://acme.com/logo.png',
  })
  @IsOptional()
  @IsString({ message: 'Logo must be a string' })
  logo?: string;

  @ApiPropertyOptional({
    description: 'Organization address',
    example: '123 Main Street',
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
    description: 'Region/State',
    example: 'Greater Accra',
  })
  @IsOptional()
  @IsString({ message: 'Region must be a string' })
  region?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'Ghana',
    default: 'Ghana',
  })
  @IsOptional()
  @IsString({ message: 'Country must be a string' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Ghana Post GPS Address',
    example: 'GA-123-4567',
  })
  @IsOptional()
  @IsString({ message: 'GPS address must be a string' })
  gpsAddress?: string;

  @ApiProperty({
    description: 'Organization size',
    enum: OrganizationSize,
    example: OrganizationSize.MEDIUM,
  })
  @IsEnum(OrganizationSize, {
    message: 'Organization size must be valid',
  })
  size: OrganizationSize;

  @ApiProperty({
    description: 'Organization sector',
    enum: Sector,
    example: Sector.TECHNOLOGY,
  })
  @IsEnum(Sector, {
    message: 'Organization sector must be valid',
  })
  sector: Sector;

  @ApiPropertyOptional({
    description: 'Whether organization should be visible in CSI Directory',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic?: boolean;
}