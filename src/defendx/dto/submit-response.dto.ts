import { IsUUID, IsOptional, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SubmitResponseDto {
  @ApiProperty({
    description: 'Question ID',
    example: 'question-uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    description: 'Answer value(s) - can be string or array for multiple choice',
    example: 'yes',
  })
  @IsNotEmpty()
  answer: string | string[];

  @ApiPropertyOptional({
    description: 'Time spent on question in seconds',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  timeSpent?: number;
}