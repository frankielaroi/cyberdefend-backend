import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../notification/services/email.service';
import { UnauthorizedException } from '@nestjs/common';
import { hashToken } from '../common/utils/token.util';

describe('AuthService - Email Verification', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordReset: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
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

  describe('forgotPassword', () => {
    it('returns the same response for unknown emails without sending mail', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nobody@example.com' });

      expect(result.message).toMatch(/If an account exists/);
      expect(mockPrismaService.passwordReset.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('stores a hashed token, emails the plaintext link and never returns the token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'test@example.com', firstName: 'Test', lastName: 'User', isActive: true,
      });
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockEmailService.sendEmail.mockResolvedValue({ success: true });
      mockConfigService.get.mockReturnValue('https://app.example');

      const result = await service.forgotPassword({ email: 'test@example.com' });
      await new Promise(setImmediate);

      const storedToken = mockPrismaService.passwordReset.create.mock.calls[0][0].data.token;
      const emailBody = mockEmailService.sendEmail.mock.calls[0][0].htmlContent;
      const plaintext = /token=([0-9a-f]{64})/.exec(emailBody)[1];

      expect(storedToken).toBe(hashToken(plaintext));
      expect(JSON.stringify(result)).not.toContain(plaintext);
    });
  });

  describe('resetPassword', () => {
    it('looks up the reset record by token hash', async () => {
      mockPrismaService.passwordReset.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword({ token: 'abc', password: 'newpassword1' })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.passwordReset.findUnique).toHaveBeenCalledWith({
        where: { token: hashToken('abc') },
      });
    });
  });
});
