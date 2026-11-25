import * as request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../../src/database/prisma.service';
import { authed, createBackup, createCampaign, createTemplate, registerUser, TestUser } from './fixtures';
import { createTestApp, resetDatabase } from './test-app';

/**
 * Two organizations, A and B. Every request is made as A's admin against B's data
 * and must not read, change or create anything in B.
 */
describe('Organization isolation (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let adminA: TestUser;
  let adminB: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    adminA = await registerUser(app, 'Org A');
    adminB = await registerUser(app, 'Org B');
  });

  afterAll(async () => {
    await app.close();
  });

  const asA = () => authed(app, adminA);

  describe('backups', () => {
    it('lists only the caller organization backups', async () => {
      const ownBackup = await createBackup(prisma, adminA.organizationId);
      await createBackup(prisma, adminB.organizationId);

      const res = await asA().get('/api/v1/backup/organization').expect(200);
      expect(res.body.map((b) => b.id)).toEqual([ownBackup.id]);
    });

    it("does not sign a download URL for another organization's backup", async () => {
      const backupB = await createBackup(prisma, adminB.organizationId);
      await asA().get(`/api/v1/backup/organization/${backupB.id}/download`).expect(404);
    });

    it("cannot delete another organization's backup", async () => {
      const backupB = await createBackup(prisma, adminB.organizationId);
      await asA().delete(`/api/v1/backup/organization/${backupB.id}`).set('organization-id', adminB.organizationId).expect(404);
      expect(await prisma.backup.count({ where: { id: backupB.id } })).toBe(1);
    });

    it('ignores the organization header and body when creating or listing agents', async () => {
      const res = await asA()
        .post('/api/v1/backup/agents')
        .send({ name: 'agent', organizationId: adminB.organizationId })
        .expect(201);
      expect(res.body.organizationId).toBe(adminA.organizationId);

      const list = await asA().get('/api/v1/backup/agents').set('organization-id', adminB.organizationId).expect(200);
      expect(list.body.every((a) => a.organizationId === adminA.organizationId)).toBe(true);
    });

    it('authenticates backup agents by their hashed token', async () => {
      const created = await asA().post('/api/v1/backup/agents').send({ name: 'agent-2' }).expect(201);
      const stored = await prisma.backupAgent.findUnique({ where: { id: created.body.id } });
      expect(stored.token).not.toBe(created.body.token);

      const agentHeaders = {
        'organization-id': adminA.organizationId,
        'agent-id': created.body.id,
        'agent-jwt': created.body.token,
      };
      await request(app.getHttpServer()).get('/api/v1/backup/jobs').set(agentHeaders).expect(200);
      // The same agent cannot claim another organization
      await request(app.getHttpServer())
        .get('/api/v1/backup/jobs')
        .set({ ...agentHeaders, 'organization-id': adminB.organizationId })
        .expect(400);
    });
  });

  describe('phishing campaigns and templates', () => {
    it("cannot read another organization's campaign", async () => {
      const template = await createTemplate(prisma, adminB.id, adminB.organizationId);
      const campaignB = await createCampaign(prisma, adminB.organizationId, adminB.id, template.id);

      await asA().get(`/api/v1/defendx-plus/campaigns/${campaignB.id}`).expect(404);
    });

    it("cannot update another organization's template", async () => {
      const templateB = await createTemplate(prisma, adminB.id, adminB.organizationId);
      await asA().put(`/api/v1/defendx-plus/templates/${templateB.id}`).send({ description: 'hijacked' }).expect(403);

      const unchanged = await prisma.phishingTemplate.findUnique({ where: { id: templateB.id } });
      expect(unchanged.description).toBe('e2e');
    });

    it('creates templates in the admin organization, not as global templates', async () => {
      const res = await asA()
        .post('/api/v1/defendx-plus/templates')
        .send({
          name: 'Org A template',
          description: 'Password expiry notice used for awareness training',
          category: 'SECURITY',
          riskLevel: 'LOW',
          defaultSubject: 'Your password expires today',
          defaultSenderName: 'IT Support',
          emailBodyHtml: '<p>Your password expires today. Please update it using the link below to keep access.</p>',
          emailBodyText: 'Your password expires today. Please update it to keep access to your account.',
          previewContent: 'Your password expires today',
        })
        .expect(201);

      const created = await prisma.phishingTemplate.findFirst({ where: { name: 'Org A template' } });
      expect(created.organizationId).toBe(adminA.organizationId);
      expect(res.status).toBe(201);
    });

    it("cannot launch a campaign from another organization's private template", async () => {
      const templateB = await createTemplate(prisma, adminB.id, adminB.organizationId);
      await asA()
        .post('/api/v1/defendx-plus/campaigns')
        .send({ name: 'Stolen', templateId: templateB.id, senderEmail: 'a@example.com' })
        .expect((res) => expect([400, 404]).toContain(res.status));
      expect(await prisma.phishingCampaign.count({ where: { organizationId: adminA.organizationId, templateId: templateB.id } })).toBe(0);
    });
  });

  describe('endpoint agents and telemetry', () => {
    it('heartbeats and configs are scoped to the caller organization', async () => {
      const agentB = await authed(app, adminB)
        .post('/api/v1/defendx-plus/agents/register')
        .send({ name: 'b', version: '1', osType: 'linux', osVersion: '1', hostname: 'host-b' })
        .expect(201);

      await asA().get(`/api/v1/defendx-plus/agents/${agentB.body.agentId}/config`).expect(404);
      await asA().post(`/api/v1/defendx-plus/agents/${agentB.body.agentId}/heartbeat`).expect(404);
    });

    it('accepts telemetry by API key only and does not link users from other organizations', async () => {
      const agentA = await asA()
        .post('/api/v1/defendx-plus/agents/register')
        .send({ name: 'a', version: '1', osType: 'linux', osVersion: '1', hostname: 'host-a' })
        .expect(201);

      const stored = await prisma.agent.findUnique({ where: { id: agentA.body.agentId } });
      expect(stored.apiKey).not.toBe(agentA.body.apiKey);

      const server = request(app.getHttpServer());
      await server.post('/api/v1/defendx-plus/telemetry').send({ events: [] }).expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/defendx-plus/telemetry')
        .set('x-api-key', agentA.body.apiKey)
        .send({ events: [{ type: 'LOGIN_FAILURE', severity: 'HIGH', userId: adminB.id }] })
        .expect(200);

      const event = await prisma.telemetryEvent.findFirst({ where: { agentId: agentA.body.agentId } });
      expect(event.userId).toBeNull();
    });
  });

  describe('invites', () => {
    it('enforces the invite usage limit and email binding', async () => {
      const invite = await prisma.inviteCode.create({
        data: {
          code: 'INV-E2ETEST01',
          organizationId: adminB.organizationId,
          createdBy: adminB.id,
          expiresAt: new Date(Date.now() + 60_000),
          usageLimit: 1,
          email: 'invited@example.com',
        },
      });

      const outsider = await registerUser(app);
      await authed(app, outsider).post('/api/v1/organizations/join').send({ inviteCode: invite.code }).expect(403);

      const fresh = await prisma.inviteCode.findUnique({ where: { id: invite.id } });
      expect(fresh.usedCount).toBe(0);
    });
  });
});
