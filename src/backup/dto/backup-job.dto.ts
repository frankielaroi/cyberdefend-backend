import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BackupJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class CreateBackupJobDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sourcePath: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  backupType?: string = 'folder';
}

export class UpdateBackupJobStatusDto {
  @ApiProperty({ enum: BackupJobStatus })
  @IsEnum(BackupJobStatus)
  @IsNotEmpty()
  status: BackupJobStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;
}