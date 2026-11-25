import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  NotificationPreferencesDto,
  TwoFactorAuthDto,
  AccountPreferencesDto,
  DeleteAccountDto,
  UserProfileResponseDto,
  UserPreferencesResponseDto,
  SecuritySettingsResponseDto,
} from '../auth/dto/profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve current user profile information'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  getUserProfile(@GetUser('id') userId: string) {
    return this.profileService.getUserProfile(userId);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update user profile information (name, phone, avatar)'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid profile data' })
  updateProfile(
    @GetUser('id') userId: string,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(userId, updateDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description: 'Change user password with current password verification'
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        success: true,
        message: 'Password changed successfully'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid password data or password mismatch' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  changePassword(
    @GetUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }
    return this.profileService.changePassword(userId, changePasswordDto);
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get user preferences',
    description: 'Retrieve user notification, security, and account preferences'
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
    type: UserPreferencesResponseDto,
  })
  getUserPreferences(@GetUser('id') userId: string) {
    return this.profileService.getUserPreferences(userId);
  }

  @Patch('preferences/notifications')
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Update user notification settings for emails, alerts, and reports'
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Notification preferences updated'
      }
    }
  })
  updateNotificationPreferences(
    @GetUser('id') userId: string,
    @Body() preferencesDto: NotificationPreferencesDto,
  ) {
    return this.profileService.updateNotificationPreferences(userId, preferencesDto);
  }

  @Patch('preferences/account')
  @ApiOperation({
    summary: 'Update account preferences',
    description: 'Update user account settings like language, timezone, and theme'
  })
  @ApiResponse({
    status: 200,
    description: 'Account preferences updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Account preferences updated'
      }
    }
  })
  updateAccountPreferences(
    @GetUser('id') userId: string,
    @Body() preferencesDto: AccountPreferencesDto,
  ) {
    return this.profileService.updateAccountPreferences(userId, preferencesDto);
  }

  @Get('security')
  @ApiOperation({
    summary: 'Get security settings',
    description: 'Retrieve user security information including 2FA status and login history'
  })
  @ApiResponse({
    status: 200,
    description: 'Security settings retrieved successfully',
    type: SecuritySettingsResponseDto,
  })
  getSecuritySettings(@GetUser('id') userId: string) {
    return this.profileService.getSecuritySettings(userId);
  }

  @Post('security/two-factor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configure two-factor authentication',
    description: 'Enable or disable two-factor authentication for the user account'
  })
  @ApiResponse({
    status: 200,
    description: 'Two-factor authentication configured successfully',
    schema: {
      example: {
        success: true,
        message: 'Two-factor authentication enabled',
        backupCodes: ['12345678', '87654321'] // Only returned when enabling
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid 2FA configuration' })
  configureTwoFactorAuth(
    @GetUser('id') userId: string,
    @Body() twoFactorDto: TwoFactorAuthDto,
  ) {
    return this.profileService.configureTwoFactorAuth(userId, twoFactorDto);
  }

  @Post('security/sessions/terminate-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Terminate all sessions',
    description: 'Terminate all active sessions except the current one'
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions terminated successfully',
    schema: {
      example: {
        success: true,
        message: 'All other sessions terminated',
        terminatedSessions: 3
      }
    }
  })
  terminateAllSessions(@GetUser('id') userId: string) {
    return this.profileService.terminateAllSessions(userId);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export user data',
    description: 'Export all user data for compliance purposes (GDPR)'
  })
  @ApiResponse({
    status: 200,
    description: 'User data export initiated',
    schema: {
      example: {
        success: true,
        message: 'Data export initiated',
        downloadUrl: '/api/downloads/user-data-export.json',
        expiresAt: '2023-12-31T23:59:59.000Z'
      }
    }
  })
  exportUserData(@GetUser('id') userId: string) {
    return this.profileService.exportUserData(userId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete user account',
    description: 'Permanently delete user account and all associated data'
  })
  @ApiResponse({
    status: 200,
    description: 'Account deletion initiated',
    schema: {
      example: {
        success: true,
        message: 'Account deletion initiated. You will receive a confirmation email.',
        deletionDate: '2023-12-31T23:59:59.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid account deletion request' })
  @ApiResponse({ status: 401, description: 'Password verification failed' })
  deleteAccount(
    @GetUser('id') userId: string,
    @Body() deleteDto: DeleteAccountDto,
  ) {
    return this.profileService.deleteAccount(userId, deleteDto);
  }

  @Post('upload-avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upload profile avatar',
    description: 'Upload and set user profile picture/avatar'
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: {
      example: {
        success: true,
        message: 'Avatar uploaded successfully',
        avatarUrl: 'https://storage.example.com/avatars/user-id.jpg'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  uploadAvatar(
    @GetUser('id') userId: string,
    @Body() uploadData: { avatarData: string; fileName: string },
  ) {
    return this.profileService.uploadAvatar(userId, uploadData);
  }

  @Delete('avatar')
  @ApiOperation({
    summary: 'Remove profile avatar',
    description: 'Remove user profile picture/avatar'
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Avatar removed successfully'
      }
    }
  })
  removeAvatar(@GetUser('id') userId: string) {
    return this.profileService.removeAvatar(userId);
  }
}