import { IsEnum, IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  ORG_ADMIN = 'ORG_ADMIN',
  ORG_MANAGER = 'ORG_MANAGER',
  END_USER = 'END_USER',
}

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: UserRole,
    example: UserRole.ORG_MANAGER,
  })
  @IsEnum(UserRole, {
    message: 'Role must be a valid organization role',
  })
  role: UserRole;
}

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited member',
    enum: UserRole,
    example: UserRole.END_USER,
  })
  @IsEnum(UserRole, {
    message: 'Role must be a valid organization role',
  })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Personal message for the invitation',
    example: 'Welcome to our cybersecurity team!',
  })
  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  message?: string;
}