import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SeverityLevel, TelemetryType } from '../../../generated/prisma';

export class TelemetryEventDto {
  @ApiProperty({ enum: TelemetryType })
  @IsEnum(TelemetryType)
  type: TelemetryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: SeverityLevel, default: SeverityLevel.INFO })
  @IsOptional()
  @IsEnum(SeverityLevel)
  severity?: SeverityLevel;

  @ApiPropertyOptional({ description: 'ISO 8601 timestamp; defaults to receive time' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Linked only if the user belongs to the agent\'s organization' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class TelemetryBatchDto {
  @ApiProperty({ type: [TelemetryEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => TelemetryEventDto)
  events: TelemetryEventDto[];
}
