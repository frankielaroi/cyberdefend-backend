import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Overall CSI Score',
    example: 75.5,
  })
  csiScore: number | null;

  @ApiProperty({
    description: 'Risk Tier',
    enum: ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
    example: 'LOW',
  })
  riskTier: string | null;

  @ApiProperty({
    description: 'Number of completed assessments',
    example: 3,
  })
  totalAssessments: number;

  @ApiProperty({
    description: 'Last assessment date',
    example: '2024-10-01T10:00:00Z',
  })
  lastAssessmentDate: Date | null;

  @ApiProperty({
    description: 'Score trend compared to previous assessment',
    example: 5.2,
  })
  scoreTrend: number | null;

  @ApiPropertyOptional({
    description: 'Benchmark comparison',
    example: {
      regional: 72.1,
      sectoral: 68.9,
      sizeBased: 74.3,
    },
  })
  benchmarks?: {
    regional: number;
    sectoral: number;
    sizeBased: number;
  };
}

export class RecentAssessmentDto {
  @ApiProperty({
    description: 'Assessment ID',
    example: 'assessment-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Assessment title',
    example: 'Q4 2024 Cybersecurity Assessment',
  })
  title: string;

  @ApiProperty({
    description: 'Assessment status',
    enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
    example: 'COMPLETED',
  })
  status: string;

  @ApiProperty({
    description: 'Assessment score',
    example: 75.5,
  })
  score: number | null;

  @ApiProperty({
    description: 'Assessment completion date',
    example: '2024-10-01T10:00:00Z',
  })
  completedAt: Date | null;

  @ApiProperty({
    description: 'Assessment creator',
    example: 'John Doe',
  })
  createdBy: string;
}