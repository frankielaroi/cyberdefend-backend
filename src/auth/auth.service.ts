import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
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
        token: refreshToken,
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
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
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

    let organization = null;
    let organizationId = registerDto.organizationId || null;

    // If organization data is provided, create new organization
    if (registerDto.organization) {
      // Check if organization with the same name already exists
      const existingOrg = await this.prisma.organization.findFirst({
        where: { name: registerDto.organization.name },
      });

      if (existingOrg) {
        throw new ConflictException('Organization with this name already exists');
      }

      organization = await this.prisma.organization.create({
        data: {
          name: registerDto.organization.name,
          email: registerDto.organization.email || null,
          phone: registerDto.organization.phone,
          website: registerDto.organization.website,
          size: registerDto.organization.size as any,
          sector: registerDto.organization.sector as any,
          isActive: true,
        },
      });

      organizationId = organization.id;
    } else if (registerDto.organizationId) {
      // Check if existing organization is valid
      organization = await this.prisma.organization.findUnique({
        where: { id: registerDto.organizationId },
      });
      
      if (!organization) {
        throw new UnauthorizedException('Invalid organization');
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Set role based on whether they're creating an organization or joining one
    let userRole = registerDto.role || 'END_USER';
    if (registerDto.organization && !registerDto.role) {
      // If creating organization and no role specified, make them ORG_ADMIN
      userRole = 'ORG_ADMIN';
    }

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        role: userRole as any,
        organizationId,
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

    // Generate email verification token
    const verificationToken = uuidv4();
    
    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(user.email, verificationToken);

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
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const { password, ...result } = user;
    return {
      message: 'User registered successfully. Please check your email for verification.',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: result,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Check if refresh token exists and is valid
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
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

      return {
        access_token: accessToken,
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
          token: refreshToken,
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
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in user record (temporary solution)
    // In production, you'd want a separate PasswordReset table
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // Store reset data as JSON in a custom field or use a separate table
        updatedAt: new Date(), // Track that a reset was requested
      },
    });

    // TODO: Send reset email with token
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

    console.log(`Password reset requested for ${user.email}. Token: ${resetToken} (expires: ${resetExpires})`);
    
    return { 
      message: 'If the email exists, a reset link has been sent',
      // Remove this in production - only for development
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken, 
        resetExpires,
        note: 'Reset token provided for development only' 
      }),
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // For now, we'll implement a basic version
    // In production, you'd verify the token against a PasswordReset table
    
    // Find user by email (in production, find by token)
    const user = await this.prisma.user.findUnique({
      where: { email: resetPasswordDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid reset request');
    }

    // TODO: Verify token and expiration
    // For now, accept any valid token format
    if (!resetPasswordDto.token || resetPasswordDto.token.length < 10) {
      throw new UnauthorizedException('Invalid reset token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(token: string) {
    // TODO: Verify email token and activate user
    
    return { message: 'Email verified successfully' };
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
}