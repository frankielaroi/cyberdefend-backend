import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInviteCodeDto {
  @ApiPropertyOptional({
    description: 'Number of days until expiration',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @IsInt({ message: 'Expiration days must be an integer' })
  @Min(1, { message: 'Expiration days must be at least 1' })
  @Max(365, { message: 'Expiration days cannot exceed 365' })
  expirationDays?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of times the code can be used',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt({ message: 'Usage limit must be an integer' })
  @Min(1, { message: 'Usage limit must be at least 1' })
  @Max(1000, { message: 'Usage limit cannot exceed 1000' })
  usageLimit?: number;
}