import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}