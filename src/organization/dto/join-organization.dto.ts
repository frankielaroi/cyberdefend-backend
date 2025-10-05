import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinOrganizationDto {
  @ApiPropertyOptional({
    description: 'Message or reason for joining the organization',
    example: 'I would like to join your organization to participate in cybersecurity assessments',
  })
  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  message?: string;
}