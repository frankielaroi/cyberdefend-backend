import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    description: 'Message or reason for joining the organization',
    example: 'I would like to join your organization to participate in cybersecurity assessments',
  })
  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  message?: string;
}