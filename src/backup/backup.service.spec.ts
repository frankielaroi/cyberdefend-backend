import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BackupService } from './backup.service';
import { PrismaService } from '../database/prisma.service';
import { hashToken } from '../common/utils/token.util';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/backup'),
}));

describe('BackupService', () => {
  let service: BackupService;

  const prisma = {
    backup: { findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
    backupAgent: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    backupJob: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const config = { get: jest.fn().mockReturnValue('test-value') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(BackupService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('organization isolation', () => {
    it('lists only the caller organization backups', async () => {
      prisma.backup.findMany.mockResolvedValue([]);

      await service.getOrganizationBackups('org-1');

      expect(prisma.backup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      );
    });

    it('does not sign a download URL for another organization backup', async () => {
      prisma.backup.findFirst.mockResolvedValue(null);

      await expect(service.getBackupDownloadUrl('backup-of-org-2', 'org-1')).rejects.toThrow(NotFoundException);
      expect(prisma.backup.findFirst).toHaveBeenCalledWith({
        where: { id: 'backup-of-org-2', organizationId: 'org-1' },
      });
    });

    it('signs the stored S3 key for an owned backup', async () => {
      prisma.backup.findFirst.mockResolvedValue({ s3Bucket: 'bucket', s3Key: 'backups/org-1/job/file.zip' });

      await expect(service.getBackupDownloadUrl('b1', 'org-1')).resolves.toEqual({
        downloadUrl: 'https://signed.example/backup',
      });
    });

    it('rejects users without an organization', async () => {
      await expect(service.getOrganizationBackups(null)).rejects.toThrow(ForbiddenException);
      await expect(service.getOrganizationAgents(undefined)).rejects.toThrow(ForbiddenException);
      expect(prisma.backup.findMany).not.toHaveBeenCalled();
    });

    it('creates agents in the caller organization, ignoring the body value', async () => {
      prisma.backupAgent.create.mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data }));

      await service.createBackupAgent({ name: 'agent', organizationId: 'org-2' }, 'org-1');

      expect(prisma.backupAgent.create.mock.calls[0][0].data.organizationId).toBe('org-1');
    });
  });

  describe('agent tokens', () => {
    it('stores only the hash and returns the plaintext once', async () => {
      prisma.backupAgent.create.mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data }));

      const result = await service.createBackupAgent({ name: 'agent' }, 'org-1');
      const stored = prisma.backupAgent.create.mock.calls[0][0].data.token;

      expect(result.token).toMatch(/^[0-9a-f]{64}$/);
      expect(stored).toBe(hashToken(result.token));
      expect(stored).not.toBe(result.token);
    });

    it('authenticates agents by token hash', async () => {
      prisma.backupAgent.findFirst.mockResolvedValue({ id: 'a1' });
      prisma.backupJob.findMany.mockResolvedValue([]);

      await service.getBackupJobs('org-1', 'a1', 'secret');

      expect(prisma.backupAgent.findFirst).toHaveBeenCalledWith({
        where: { id: 'a1', organizationId: 'org-1', token: hashToken('secret') },
      });
    });

    it('rejects missing or wrong credentials', async () => {
      prisma.backupAgent.findFirst.mockResolvedValue(null);

      await expect(service.getBackupJobs('org-1', 'a1', 'wrong')).rejects.toThrow(BadRequestException);
      await expect(service.getBackupJobs('org-1', 'a1', undefined)).rejects.toThrow(BadRequestException);
      expect(prisma.backupJob.findMany).not.toHaveBeenCalled();
    });
  });
});
