import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../database/prisma.service';
import { generateToken, hashToken } from '../common/utils/token.util';
import { EmailService } from '../notification/services/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            size: true,
            sector: true,
          },
        },
      },
    });

    if (user && user.isActive && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: user.organizationId 
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    return {
      message: 'Login successful',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name,
        phone: user.phone,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        lastLogin: new Date().toISOString(),
        createdAt: user.createdAt?.toISOString(),
        organization: user.organization,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Roles and organization membership are never taken from the request: a public signup
    // could otherwise claim SUPER_ADMIN or join any organization. Existing organizations
    // are joined through invite codes (POST /organizations/join).
    if (registerDto.role && registerDto.role !== 'END_USER' && !registerDto.organization) {
      throw new ForbiddenException('Role cannot be chosen at registration');
    }
    if (registerDto.organizationId) {
      throw new ForbiddenException('Use an invite code to join an existing organization');
    }

    if (registerDto.organization) {
      const existingOrg = await this.prisma.organization.findFirst({
        where: { name: registerDto.organization.name },
      });

      if (existingOrg) {
        throw new ConflictException('Organization with this name already exists');
      }
    }

    // Creating an organization makes the user its admin; otherwise a plain end user
    const userRole = registerDto.organization ? 'ORG_ADMIN' : 'END_USER';
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const verificationToken = uuidv4();

    // Organization, user and membership are created together or not at all
    const user = await this.prisma.$transaction(async (tx) => {
      const organization = registerDto.organization
        ? await tx.organization.create({
            data: {
              name: registerDto.organization.name,
              email: registerDto.organization.email || null,
              phone: registerDto.organization.phone,
              website: registerDto.organization.website,
              size: registerDto.organization.size as any,
              sector: registerDto.organization.sector as any,
              isActive: true,
            },
          })
        : null;

      const created = await tx.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          phone: registerDto.phone,
          role: userRole,
          organizationId: organization?.id ?? null,
          verificationToken,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
              size: true,
              sector: true,
            },
          },
        },
      });

      if (organization) {
        await tx.organizationMember.create({
          data: {
            userId: created.id,
            organizationId: organization.id,
            role: userRole,
            status: 'ACTIVE',
          },
        });
      }

      return created;
    });

    // Send verification email (async, don't block registration)
    this.sendVerificationEmail(user.email, verificationToken, `${user.firstName} ${user.lastName}`)
      .then(() => {
        this.logger.log(`Verification email sent to user ${user.id}`);
      })
      .catch((emailError) => {
        this.logger.error(`Failed to send verification email to user ${user.id}: ${emailError.message}`);
        // Note: Registration continues even if email fails
        // User can request resend via /auth/resend-verification endpoint
      });

    // Generate JWT tokens for immediate login
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: user.organizationId 
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const { password, ...result } = user;
    return {
      message: 'User registered successfully. Please check your email for verification.',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        ...result,
        name: `${result.firstName} ${result.lastName}`,
        organizationName: result.organization?.name,
        lastLogin: new Date().toISOString(),
        createdAt: result.createdAt?.toISOString(),
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Check if refresh token exists and is valid
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: hashToken(refreshToken) },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new access token
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      });

      // Update refresh token in database
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          token: hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { 
          userId,
          token: hashToken(refreshToken),
        },
      });
    } else {
      // Logout from all devices
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !await bcrypt.compare(changePasswordDto.currentPassword, user.password)) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    // Same response whether or not the account exists, so the endpoint cannot be used to enumerate users
    const response = {
      success: true,
      message: 'If an account exists for that email, a reset link has been sent',
    };

    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user || !user.isActive) {
      return response;
    }

    const resetToken = generateToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.$transaction([
      this.prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordReset.create({
        data: {
          token: hashToken(resetToken),
          userId: user.id,
          expiresAt: resetExpires,
        },
      }),
    ]);

    // Not awaited: response time must not depend on whether the account exists
    this.sendPasswordResetEmail(user.email, resetToken, `${user.firstName} ${user.lastName}`).catch((error) =>
      this.logger.error(`Failed to send password reset email for user ${user.id}: ${error.message}`),
    );

    return response;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Find the reset token
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token: hashToken(resetPasswordDto.token) },
    });

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 12);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { 
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: resetRecord.userId },
    });

    return { 
      success: true,
      message: 'Password reset successful' 
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Mark email as verified and clear the verification token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        emailVerified: true,
        verificationToken: null
      }
    });
    
    return { message: 'Email verified successfully' };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              size: true,
              sector: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        valid: true,
        user: {
          ...user,
          name: `${user.firstName} ${user.lastName}`,
          organizationName: user.organization?.name,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            size: true,
            sector: true,
            logo: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  // Email Verification Methods
  private async sendVerificationEmail(email: string, token: string, userName: string): Promise<void> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
    
    const emailData = {
      to: email,
      subject: 'Verify Your Email - CyberDefend 360',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to CyberDefend 360!</h2>
          <p>Hi ${userName},</p>
          <p>Thank you for registering with CyberDefend 360. To complete your account setup, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This verification link will expire in 24 hours.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            If you didn't create an account with CyberDefend 360, please ignore this email.
          </p>
        </div>
      `,
      textContent: `
        Welcome to CyberDefend 360!
        
        Hi ${userName},
        
        Thank you for registering with CyberDefend 360. To complete your account setup, please verify your email address by visiting:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours.
        
        If you didn't create an account with CyberDefend 360, please ignore this email.
      `,
      category: 'verification'
    };

    await this.emailService.sendEmail(emailData);
  }

  private async sendPasswordResetEmail(email: string, token: string, userName: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    const safeName = escapeHtml(userName);

    const result = await this.emailService.sendEmail({
      to: email,
      subject: 'Reset Your Password - CyberDefend 360',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password reset request</h2>
          <p>Hi ${safeName},</p>
          <p>We received a request to reset the password for your CyberDefend 360 account. Click the button below to choose a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link expires in 1 hour and can only be used once.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            If you didn't request a password reset, you can ignore this email. Your password will not change.
          </p>
        </div>
      `,
      textContent: `
        Password reset request

        Hi ${userName},

        We received a request to reset the password for your CyberDefend 360 account. Choose a new password here:

        ${resetUrl}

        This link expires in 1 hour and can only be used once.

        If you didn't request a password reset, you can ignore this email.
      `,
      category: 'password-reset',
    });

    if (result && result.success === false) {
      throw new Error(result.error || 'Email provider rejected the message');
    }
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true, emailVerified: true, verificationToken: true }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Generate new verification token
    const verificationToken = uuidv4();
    
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken }
    });

    await this.sendVerificationEmail(email, verificationToken, `${user.firstName} ${user.lastName}`);

    return { message: 'Verification email sent successfully' };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
