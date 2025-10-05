import { IsString, IsOptional, IsEnum, IsNotEmpty, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleScanDto {
  @ApiProperty({
    description: 'Scan type',
    enum: ['VULNERABILITY_SCAN', 'MALWARE_SCAN', 'COMPLIANCE_SCAN', 'CONFIGURATION_SCAN', 'NETWORK_SCAN'],
    example: 'VULNERABILITY_SCAN',
  })
  @IsEnum(['VULNERABILITY_SCAN', 'MALWARE_SCAN', 'COMPLIANCE_SCAN', 'CONFIGURATION_SCAN', 'NETWORK_SCAN'])
  type: string;

  @ApiProperty({
    description: 'Scan schedule frequency',
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'],
    example: 'WEEKLY',
  })
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'])
  frequency: string;

  @ApiProperty({
    description: 'Day of week (for weekly) or day of month (for monthly)',
    example: 'MONDAY',
  })
  @IsString()
  @IsNotEmpty()
  schedule: string;

  @ApiProperty({
    description: 'Time to run the scan (HH:MM format)',
    example: '02:00',
  })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiPropertyOptional({
    description: 'Specific agents/devices to scan (empty for all)',
    type: [String],
    example: ['agent-1', 'agent-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];

  @ApiPropertyOptional({
    description: 'Scan configuration parameters',
    example: {
      depth: 'FULL',
      includeNetworkScan: true,
      reportFormat: 'PDF',
    },
  })
  @IsOptional()
  config?: {
    depth?: string;
    includeNetworkScan?: boolean;
    reportFormat?: string;
    [key: string]: any;
  };
}

export class RunScanDto {
  @ApiProperty({
    description: 'Scan type',
    enum: ['VULNERABILITY_SCAN', 'MALWARE_SCAN', 'COMPLIANCE_SCAN', 'CONFIGURATION_SCAN', 'NETWORK_SCAN'],
    example: 'VULNERABILITY_SCAN',
  })
  @IsEnum(['VULNERABILITY_SCAN', 'MALWARE_SCAN', 'COMPLIANCE_SCAN', 'CONFIGURATION_SCAN', 'NETWORK_SCAN'])
  type: string;

  @ApiPropertyOptional({
    description: 'Specific agents/devices to scan (empty for all)',
    type: [String],
    example: ['agent-1', 'agent-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];

  @ApiPropertyOptional({
    description: 'Scan priority',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    example: 'NORMAL',
  })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({
    description: 'Scan configuration parameters',
    example: {
      depth: 'QUICK',
      includeNetworkScan: false,
      reportFormat: 'JSON',
    },
  })
  @IsOptional()
  config?: {
    depth?: string;
    includeNetworkScan?: boolean;
    reportFormat?: string;
    [key: string]: any;
  };
}

export class ScanFiltersDto {
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
    description: 'Filter by scan type',
    enum: ['VULNERABILITY_SCAN', 'MALWARE_SCAN', 'COMPLIANCE_SCAN', 'CONFIGURATION_SCAN', 'NETWORK_SCAN'],
    example: 'VULNERABILITY_SCAN',
  })
  @IsOptional()
  @IsEnum(['VULNERABILITY_SCAN', 'MALWARE_SCAN', 'COMPLIANCE_SCAN', 'CONFIGURATION_SCAN', 'NETWORK_SCAN'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by scan status',
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    example: 'COMPLETED',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])
  status?: string;
}