import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AlertFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by severity level',
    enum: ['LOW', 'INFO', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'HIGH',
  })
  @IsOptional()
  @IsEnum(['LOW', 'INFO', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: string;

  @ApiPropertyOptional({
    description: 'Filter by alert status',
    enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE'],
    example: 'OPEN',
  })
  @IsOptional()
  @IsEnum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO string)',
    example: '2024-10-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO string)',
    example: '2024-10-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by device/agent name',
    example: 'DESKTOP-ABC123',
  })
  @IsOptional()
  @IsString()
  device?: string;
}

export class MonitoringDashboardStatsDto {
  @ApiProperty({
    description: 'Total active alerts',
    example: 25,
  })
  activeAlerts: number;

  @ApiProperty({
    description: 'Critical alerts count',
    example: 3,
  })
  criticalAlerts: number;

  @ApiProperty({
    description: 'High priority alerts count',
    example: 7,
  })
  highAlerts: number;

  @ApiProperty({
    description: 'Authentication failure trends (last 24h)',
    example: {
      totalFailures: 45,
      trend: 'up',
      percentage: 15.2,
    },
  })
  authFailureTrends: {
    totalFailures: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  };

  @ApiProperty({
    description: 'Devices currently offline',
    example: 5,
  })
  devicesOffline: number;

  @ApiProperty({
    description: 'Antivirus/EDR status summary',
    example: {
      protected: 95,
      unprotected: 3,
      outdated: 2,
    },
  })
  avStatus: {
    protected: number;
    unprotected: number;
    outdated: number;
  };

  @ApiProperty({
    description: 'Suspicious outbound domains (top 5)',
    example: [
      { domain: 'suspicious-site.com', hits: 12 },
      { domain: 'malware-host.net', hits: 8 },
    ],
  })
  suspiciousDomains: Array<{
    domain: string;
    hits: number;
  }>;
}