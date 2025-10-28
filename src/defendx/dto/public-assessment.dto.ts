import { ApiProperty } from '@nestjs/swagger';
import { RiskTier, Sector, OrganizationSize } from '../../../generated/prisma';

export class PublicAssessmentItemDto {
  @ApiProperty({ description: 'Assessment ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Organization name' })
  organizationName: string;

  @ApiProperty({ description: 'Assessment score' })
  score: number;

  @ApiProperty({ description: 'Risk tier', enum: RiskTier })
  tier: RiskTier;

  @ApiProperty({ description: 'Organization sector', enum: Sector })
  sector: Sector;

  @ApiProperty({ description: 'Geographic region' })
  region: string;

  @ApiProperty({ description: 'Organization size', enum: OrganizationSize })
  size: OrganizationSize;

  @ApiProperty({ description: 'Last assessment date' })
  lastAssessmentDate: Date;
}

export class PublicAssessmentResultDto {
  @ApiProperty({ description: 'List of public assessments', type: [PublicAssessmentItemDto] })
  items: PublicAssessmentItemDto[];

  @ApiProperty({ description: 'Total number of records' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;
}