import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsEnum, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name cannot be empty' })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name cannot be empty' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+233-20-123-4567',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'User avatar/profile picture URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString({ message: 'Avatar must be a string' })
  avatar?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'oldPassword123',
  })
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'NewPassword123!',
  })
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
  )
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewPassword123!',
  })
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}

export class NotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable email notifications for assessments',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Email notifications must be a boolean' })
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable assessment reminders',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Assessment reminders must be a boolean' })
  assessmentReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Enable security alerts',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Security alerts must be a boolean' })
  securityAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Enable weekly reports',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Weekly reports must be a boolean' })
  weeklyReports?: boolean;

  @ApiPropertyOptional({
    description: 'Enable monthly reports',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Monthly reports must be a boolean' })
  monthlyReports?: boolean;

  @ApiPropertyOptional({
    description: 'Enable phishing campaign notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Phishing notifications must be a boolean' })
  phishingNotifications?: boolean;
}

export class TwoFactorAuthDto {
  @ApiProperty({
    description: 'Whether to enable two-factor authentication',
    example: true,
  })
  @IsBoolean({ message: 'Two-factor auth setting must be a boolean' })
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'Phone number for SMS-based 2FA',
    example: '+233-20-123-4567',
  })
  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Backup email for 2FA codes',
    example: 'backup@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid backup email' })
  backupEmail?: string;
}

export class AccountPreferencesDto {
  @ApiPropertyOptional({
    description: 'Preferred language',
    enum: ['en', 'tw', 'ak'],
    example: 'en',
  })
  @IsOptional()
  @IsEnum(['en', 'tw', 'ak'], { message: 'Please provide a valid language' })
  language?: string;

  @ApiPropertyOptional({
    description: 'Preferred timezone',
    example: 'Africa/Accra',
  })
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Date format preference',
    enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
    example: 'DD/MM/YYYY',
  })
  @IsOptional()
  @IsEnum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], { message: 'Please provide a valid date format' })
  dateFormat?: string;

  @ApiPropertyOptional({
    description: 'Theme preference',
    enum: ['light', 'dark', 'auto'],
    example: 'auto',
  })
  @IsOptional()
  @IsEnum(['light', 'dark', 'auto'], { message: 'Please provide a valid theme' })
  theme?: string;
}

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Current password for account deletion confirmation',
    example: 'currentPassword123',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required for account deletion' })
  password: string;

  @ApiProperty({
    description: 'Reason for account deletion',
    example: 'No longer needed',
  })
  @IsString({ message: 'Reason must be a string' })
  @IsNotEmpty({ message: 'Reason is required' })
  reason: string;

  @ApiProperty({
    description: 'Confirmation text (must type "DELETE MY ACCOUNT")',
    example: 'DELETE MY ACCOUNT',
  })
  @IsString({ message: 'Confirmation must be a string' })
  @Matches(/^DELETE MY ACCOUNT$/, { message: 'Please type "DELETE MY ACCOUNT" to confirm' })
  confirmation: string;
}

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User unique identifier' })
  id: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;

  @ApiProperty({ description: 'User phone number' })
  phone?: string;

  @ApiProperty({ description: 'User avatar URL' })
  avatar?: string;

  @ApiProperty({ description: 'User role' })
  role: string;

  @ApiProperty({ description: 'Email verification status' })
  emailVerified: boolean;

  @ApiProperty({ description: 'Account active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Organization information' })
  organization?: {
    id: string;
    name: string;
    role: string;
  };

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last profile update' })
  updatedAt: Date;
}

export class UserPreferencesResponseDto {
  @ApiProperty({ description: 'Notification preferences' })
  notifications: {
    emailNotifications: boolean;
    assessmentReminders: boolean;
    securityAlerts: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    phishingNotifications: boolean;
  };

  @ApiProperty({ description: 'Two-factor authentication settings' })
  twoFactorAuth: {
    enabled: boolean;
    phoneNumber?: string;
    backupEmail?: string;
  };

  @ApiProperty({ description: 'Account preferences' })
  account: {
    language: string;
    timezone: string;
    dateFormat: string;
    theme: string;
  };
}

export class SecuritySettingsResponseDto {
  @ApiProperty({ description: 'Two-factor authentication status' })
  twoFactorEnabled: boolean;

  @ApiProperty({ description: 'Last password change date' })
  lastPasswordChange?: Date;

  @ApiProperty({ description: 'Number of active sessions' })
  activeSessions: number;

  @ApiProperty({ description: 'Last login information' })
  lastLogin: {
    date: Date;
    ipAddress: string;
    userAgent: string;
  };

  @ApiProperty({ description: 'Recent login attempts' })
  recentLoginAttempts: Array<{
    date: Date;
    success: boolean;
    ipAddress: string;
    userAgent: string;
  }>;
}