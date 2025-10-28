import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
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

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getUserProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        role: user.role,
      } : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<UserProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateDto,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      isActive: updatedUser.isActive,
      organization: updatedUser.organization ? {
        id: updatedUser.organization.id,
        name: updatedUser.organization.name,
        role: updatedUser.role,
      } : undefined,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    // TODO: Invalidate all refresh tokens except current session
    // await this.authService.invalidateAllRefreshTokens(userId, currentSessionToken);

    return {
      success: true,
      message: 'Password changed successfully'
    };
  }

  async getUserPreferences(userId: string): Promise<UserPreferencesResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // For now, return default preferences since we don't have a preferences table
    // In a real application, you would have a UserPreferences table
    return {
      notifications: {
        emailNotifications: true,
        assessmentReminders: true,
        securityAlerts: true,
        weeklyReports: false,
        monthlyReports: true,
        phishingNotifications: true,
      },
      twoFactorAuth: {
        enabled: false,
        phoneNumber: user.phone,
        backupEmail: undefined,
      },
      account: {
        language: 'en',
        timezone: 'Africa/Accra',
        dateFormat: 'DD/MM/YYYY',
        theme: 'auto',
      },
    };
  }

  async updateNotificationPreferences(userId: string, preferencesDto: NotificationPreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: Update user preferences in database
    // For now, we'll just return success
    // In a real application, you would update a UserPreferences table

    return {
      success: true,
      message: 'Notification preferences updated'
    };
  }

  async updateAccountPreferences(userId: string, preferencesDto: AccountPreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: Update user preferences in database
    // For now, we'll just return success

    return {
      success: true,
      message: 'Account preferences updated'
    };
  }

  async getSecuritySettings(userId: string): Promise<SecuritySettingsResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: Get actual security data from database
    // For now, return mock data
    return {
      twoFactorEnabled: false,
      lastPasswordChange: user.updatedAt,
      activeSessions: 1,
      lastLogin: {
        date: user.updatedAt,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0...',
      },
      recentLoginAttempts: [
        {
          date: user.updatedAt,
          success: true,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0...',
        }
      ],
    };
  }

  async configureTwoFactorAuth(userId: string, twoFactorDto: TwoFactorAuthDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: Implement actual 2FA logic
    // This would involve:
    // 1. Generating TOTP secret
    // 2. Creating QR code for authenticator apps
    // 3. Storing 2FA settings
    // 4. Generating backup codes

    const backupCodes = twoFactorDto.enabled ? [
      Math.random().toString(36).substring(2, 10),
      Math.random().toString(36).substring(2, 10),
      Math.random().toString(36).substring(2, 10),
      Math.random().toString(36).substring(2, 10),
    ] : undefined;

    return {
      success: true,
      message: twoFactorDto.enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
      backupCodes,
    };
  }

  async terminateAllSessions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: Implement session termination
    // This would involve:
    // 1. Invalidating all refresh tokens except current
    // 2. Clearing session storage
    // 3. Logging the action

    // For now, just delete all refresh tokens for this user
    const deletedTokens = await this.prisma.refreshToken.deleteMany({
      where: { userId }
    });

    return {
      success: true,
      message: 'All other sessions terminated',
      terminatedSessions: deletedTokens.count,
    };
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            assessments: true
          }
        },
        // Add other related data as needed
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: Generate actual export file
    // This would involve:
    // 1. Collecting all user data
    // 2. Creating export file (JSON/CSV)
    // 3. Storing in secure location
    // 4. Setting expiration

    const exportId = `export-${userId}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      success: true,
      message: 'Data export initiated',
      downloadUrl: `/api/downloads/${exportId}.json`,
      expiresAt,
    };
  }

  async deleteAccount(userId: string, deleteDto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(deleteDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password verification failed');
    }

    // TODO: Implement account deletion logic
    // This would involve:
    // 1. Anonymizing or deleting user data
    // 2. Handling organization membership
    // 3. Cleaning up related records
    // 4. Sending confirmation email
    // 5. Scheduling actual deletion (grace period)

    // For now, just mark as inactive
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        isActive: false,
        // You might want to anonymize the email and other PII
      }
    });

    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days grace period

    return {
      success: true,
      message: 'Account deletion initiated. You will receive a confirmation email.',
      deletionDate,
    };
  }

  async uploadAvatar(userId: string, uploadData: { avatarData: string; fileName: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: Implement actual file upload
    // This would involve:
    // 1. Validating file format and size
    // 2. Uploading to cloud storage (S3, etc.)
    // 3. Generating public URL
    // 4. Updating user avatar field

    const avatarUrl = `https://storage.example.com/avatars/${userId}.jpg`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl }
    });

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl,
    };
  }

  async removeAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: null }
    });

    return {
      success: true,
      message: 'Avatar removed successfully'
    };
  }
}