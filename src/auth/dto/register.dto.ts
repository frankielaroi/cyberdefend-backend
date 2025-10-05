import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Define UserRole enum to match Prisma schema
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CSA_ADMIN = 'CSA_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  ORG_MANAGER = 'ORG_MANAGER',
  END_USER = 'END_USER',
}

// Organization creation DTO for new registrations
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

  @ApiProperty({
    description: 'Organization size',
    enum: ['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
    example: 'MEDIUM',
  })
  @IsEnum(['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'], {
    message: 'Organization size must be valid',
  })
  size: string;

  @ApiProperty({
    description: 'Organization sector',
    enum: ['BANKING', 'TELECOMMUNICATIONS', 'INSURANCE', 'GOVERNMENT', 'HEALTHCARE', 'EDUCATION', 'ENERGY', 'MANUFACTURING', 'RETAIL', 'LOGISTICS', 'TECHNOLOGY', 'NGO', 'OTHER'],
    example: 'TECHNOLOGY',
  })
  @IsEnum(['BANKING', 'TELECOMMUNICATIONS', 'INSURANCE', 'GOVERNMENT', 'HEALTHCARE', 'EDUCATION', 'ENERGY', 'MANUFACTURING', 'RETAIL', 'LOGISTICS', 'TECHNOLOGY', 'NGO', 'OTHER'], {
    message: 'Organization sector must be valid',
  })
  sector: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+233501234567',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Organization ID for the user',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Organization ID must be a valid UUID' })
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    example: UserRole.END_USER,
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Role must be a valid user role',
  })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Organization details for new organization registration',
    type: CreateOrganizationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrganizationDto)
  organization?: CreateOrganizationDto;
}