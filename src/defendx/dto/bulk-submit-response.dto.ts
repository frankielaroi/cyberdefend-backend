import { IsString, IsUUID, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SubmitResponseDto } from './submit-response.dto';

export class BulkSubmitResponseDto {
  @ApiProperty({
    description: 'Assessment ID',
    example: 'assessment-uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  assessmentId: string;

  @ApiProperty({
    description: 'Array of assessment responses',
    type: [SubmitResponseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitResponseDto)
  responses: SubmitResponseDto[];
}