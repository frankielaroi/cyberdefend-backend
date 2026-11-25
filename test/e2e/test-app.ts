import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/database/prisma.service';
import { EmailService } from '../../src/notification/services/email.service';
import { SmsService } from '../../src/notification/services/sms.service';

export const emailMock = {
  sendEmail: jest.fn().mockResolvedValue({ success: true, timestamp: new Date(), attempts: 1 }),
  sendBulkEmails: jest.fn().mockResolvedValue([]),
  sendBulkEmail: jest.fn().mockResolvedValue({ success: true, timestamp: new Date(), attempts: 1 }),
  testConnection: jest.fn().mockResolvedValue(true),
};

export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailService)
    .useValue(emailMock)
    .overrideProvider(SmsService)
    .useValue({ sendSms: jest.fn().mockResolvedValue({ success: true }) })
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  return app;
}

/** Empties every application table (keeps migration history). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
}
