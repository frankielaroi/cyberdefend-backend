import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../notification/services/email.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService - Email Verification', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyEmail', () => {
    it('should verify email successfully with valid token', async () => {
      const token = 'valid-token';
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        emailVerified: false,
        verificationToken: token,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        verificationToken: null,
      });

      const result = await service.verifyEmail(token);

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { verificationToken: token },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: {
          emailVerified: true,
          verificationToken: null,
        },
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const token = 'invalid-token';

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail(token)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should return already verified message for already verified email', async () => {
      const token = 'valid-token';
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        emailVerified: true,
        verificationToken: token,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.verifyEmail(token);

      expect(result).toEqual({ message: 'Email is already verified' });
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-id',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: false,
        verificationToken: 'old-token',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        verificationToken: 'new-token',
      });
      mockEmailService.sendEmail.mockResolvedValue({ success: true });
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      const result = await service.resendVerificationEmail(email);

      expect(result).toEqual({ message: 'Verification email sent successfully' });
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const email = 'nonexistent@example.com';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.resendVerificationEmail(email)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return already verified message for verified email', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-id',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
        verificationToken: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.resendVerificationEmail(email);

      expect(result).toEqual({ message: 'Email is already verified' });
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });
});