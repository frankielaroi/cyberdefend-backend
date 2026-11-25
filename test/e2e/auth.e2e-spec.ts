import * as request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../../src/database/prisma.service';
import { hashToken } from '../../src/common/utils/token.util';
import { authed, registerUser } from './fixtures';
import { createTestApp, emailMock, resetDatabase } from './test-app';

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('GET /health reports the database as up', async () => {
    const res = await http().get('/api/v1/health').expect(200);
    expect(res.body.info.database.status).toBe('up');
  });

  describe('registration', () => {
    it('creates an organization admin when registering an organization', async () => {
      const admin = await registerUser(app, 'Auth Org');

      const user = await prisma.user.findUnique({ where: { id: admin.id } });
      expect(user.role).toBe('ORG_ADMIN');
      expect(user.organizationId).toBe(admin.organizationId);
      expect(await prisma.organizationMember.count({ where: { userId: admin.id } })).toBe(1);
    });

    it('rejects a self-assigned SUPER_ADMIN role', async () => {
      await http()
        .post('/api/v1/auth/register')
        .send({ email: 'evil@example.com', password: 'Password123!', firstName: 'E', lastName: 'V', role: 'SUPER_ADMIN' })
        .expect(403);
      expect(await prisma.user.count({ where: { email: 'evil@example.com' } })).toBe(0);
    });

    it('rejects joining an existing organization by id', async () => {
      const admin = await registerUser(app, 'Target Org');
      await http()
        .post('/api/v1/auth/register')
        .send({
          email: 'sneaky@example.com',
          password: 'Password123!',
          firstName: 'S',
          lastName: 'N',
          organizationId: admin.organizationId,
        })
        .expect(403);
    });
  });

  describe('tokens', () => {
    it('stores refresh tokens hashed and rotates them on refresh', async () => {
      const user = await registerUser(app);
      expect(await prisma.refreshToken.count({ where: { token: user.refreshToken } })).toBe(0);
      expect(await prisma.refreshToken.count({ where: { token: hashToken(user.refreshToken) } })).toBe(1);

      // Ensure the rotated JWT differs from the original (iat has 1s resolution)
      await new Promise((r) => setTimeout(r, 1100));
      const res = await http().post('/api/v1/auth/refresh-token').send({ refresh_token: user.refreshToken }).expect(200);
      expect(res.body.refresh_token).not.toBe(user.refreshToken);

      // The old refresh token no longer works
      await http().post('/api/v1/auth/refresh-token').send({ refresh_token: user.refreshToken }).expect(401);
    });

    it('rejects requests without a token on protected routes', async () => {
      const res = await http().get('/api/v1/auth/profile').expect(401);
      expect(res.body).toMatchObject({ statusCode: 401, path: '/api/v1/auth/profile' });
    });
  });

  describe('password reset', () => {
    it('emails a working reset link without exposing the token', async () => {
      const user = await registerUser(app);
      emailMock.sendEmail.mockClear();

      const res = await http().post('/api/v1/auth/forgot-password').send({ email: user.email }).expect(200);
      expect(JSON.stringify(res.body)).not.toMatch(/[0-9a-f]{64}/);

      await new Promise((r) => setImmediate(r));
      const resetMail = emailMock.sendEmail.mock.calls.find(([mail]) => mail.category === 'password-reset')[0];
      const token = /token=([0-9a-f]{64})/.exec(resetMail.htmlContent)[1];

      await http().post('/api/v1/auth/reset-password').send({ token, password: 'NewPassword123!' }).expect(200);
      // Single use
      await http().post('/api/v1/auth/reset-password').send({ token, password: 'Another123!' }).expect(401);
    });

    it('answers the same way for unknown emails', async () => {
      const res = await http().post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.com' }).expect(200);
      expect(res.body.message).toMatch(/If an account exists/);
    });
  });

  it('platform-only tracking stats are forbidden to organization admins', async () => {
    const admin = await registerUser(app, 'Stats Org');
    await authed(app, admin).get('/api/v1/track/stats/someone@example.com').expect(403);
  });
});
