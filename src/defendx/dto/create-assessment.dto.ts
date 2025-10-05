import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssessmentDto {
  @ApiProperty({
    description: 'Assessment title',
    example: 'Q4 2024 Cybersecurity Assessment',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Assessment description',
    example: 'Quarterly assessment to evaluate our cybersecurity posture',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Assessment type',
    enum: ['CSI_ASSESSMENT', 'COMPLIANCE_CHECK', 'SECURITY_AUDIT', 'BASELINE_ASSESSMENT'],
    example: 'CSI_ASSESSMENT',
  })
  @IsOptional()
  @IsEnum(['CSI_ASSESSMENT', 'COMPLIANCE_CHECK', 'SECURITY_AUDIT', 'BASELINE_ASSESSMENT'])
  type?: string;
}