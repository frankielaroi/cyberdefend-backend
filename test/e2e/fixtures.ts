import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../../src/database/prisma.service';

export interface TestUser {
  id: string;
  email: string;
  organizationId: string | null;
  accessToken: string;
  refreshToken: string;
}

const PASSWORD = 'Password123!';

/** Registers a user; with `orgName` the user creates that organization and becomes its ORG_ADMIN. */
export async function registerUser(app: NestExpressApplication, orgName?: string): Promise<TestUser> {
  const email = `user-${randomUUID()}@example.com`;
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email,
      password: PASSWORD,
      firstName: 'Test',
      lastName: 'User',
      ...(orgName && { organization: { name: orgName, size: 'SMALL', sector: 'TECHNOLOGY' } }),
    })
    .expect(201);

  return {
    id: res.body.user.id,
    email,
    organizationId: res.body.user.organizationId,
    accessToken: res.body.access_token,
    refreshToken: res.body.refresh_token,
  };
}

export function authed(app: NestExpressApplication, user: TestUser) {
  const server = app.getHttpServer();
  const auth = { Authorization: `Bearer ${user.accessToken}` };
  return {
    get: (url: string) => request(server).get(url).set(auth),
    post: (url: string) => request(server).post(url).set(auth),
    put: (url: string) => request(server).put(url).set(auth),
    delete: (url: string) => request(server).delete(url).set(auth),
  };
}

export async function createTemplate(prisma: PrismaService, createdBy: string, organizationId: string | null) {
  return prisma.phishingTemplate.create({
    data: {
      name: `Template ${randomUUID()}`,
      description: 'e2e',
      category: 'SECURITY',
      riskLevel: 'LOW',
      defaultSubject: 'Subject',
      defaultSenderName: 'Sender',
      emailBodyHtml: '<p>Hello</p>',
      emailBodyText: 'Hello',
      previewContent: 'Hello',
      createdBy,
      organizationId,
    },
  });
}

export async function createCampaign(prisma: PrismaService, organizationId: string, createdBy: string, templateId: string) {
  return prisma.phishingCampaign.create({
    data: {
      name: 'Campaign',
      template: '<p>Hello</p>',
      subject: 'Subject',
      senderName: 'Sender',
      senderEmail: 'sender@example.com',
      organizationId,
      createdBy,
      templateId,
    },
  });
}

export async function createBackup(prisma: PrismaService, organizationId: string) {
  const job = await prisma.backupJob.create({ data: { sourcePath: '/data', organizationId } });
  return prisma.backup.create({
    data: {
      filename: 'file.zip',
      originalName: 'file.zip',
      size: 10,
      mimeType: 'application/zip',
      s3Key: `backups/${organizationId}/${job.id}/file.zip`,
      s3Bucket: 'e2e-bucket',
      uploadedBy: 'agent',
      organizationId,
      jobId: job.id,
    },
  });
}
