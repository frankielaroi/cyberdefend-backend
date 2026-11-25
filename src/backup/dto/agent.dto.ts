import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBackupAgentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  /** Ignored: the organization is taken from the authenticated user. Kept so older clients still validate. */
  @ApiPropertyOptional({ deprecated: true })
  @IsString()
  @IsOptional()
  organizationId?: string;
}

export class AgentAuthDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  organizationId: string;
}