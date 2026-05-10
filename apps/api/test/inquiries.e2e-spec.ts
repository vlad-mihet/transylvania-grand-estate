import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient, AdminRole, PropertyTier, PropertyType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, MockEmailService } from './test-app.factory';
import { unwrap, bearer } from './fixtures';

/**
 * Coverage for the contact-flow audit (2026-05-10) Wave A + B work:
 *
 *   - POST /inquiries happy path with consent + email dispatch
 *   - GDPR consent enforcement (rejected without `gdprConsent: true`)
 *   - Honeypot trap silently drops the row, returns fake 201
 *   - Rate limiter trips on the 6th request from the same IP
 *   - AGENT scope on GET (sees only their assigned property's leads)
 *   - PATCH /:id/status + DELETE soft-delete + POST /:id/restore
 *   - Site stamping derives siteId from X-Site header
 */
describe('Inquiries (e2e)', () => {
  let app: INestApplication;
  let mockEmail: MockEmailService;
  let prisma: PrismaClient;
  let adminToken: string;

  async function seedAdmin(): Promise<{ id: string; token: string }> {
    const passwordHash = await bcrypt.hash('SuperSecretPass123', 4);
    const user = await prisma.adminUser.create({
      data: {
        email: 'admin@test.local',
        passwordHash,
        name: 'Admin',
        role: AdminRole.SUPER_ADMIN,
      },
    });
    const jwt = app.get(JwtService);
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, agentId: null },
      { secret: process.env.JWT_ADMIN_ACCESS_SECRET, expiresIn: '15m' },
    );
    return { id: user.id, token };
  }

  async function seedAgent(opts: {
    email: string;
    agentId: string;
  }): Promise<string> {
    const passwordHash = await bcrypt.hash('AgentPass1234567', 4);
    await prisma.agent.create({
      data: {
        id: opts.agentId,
        slug: opts.agentId,
        firstName: 'Agent',
        lastName: 'Smith',
        email: opts.email,
        phone: '+40700000000',
        bio: { en: 'Test agent', ro: 'Agent de test' },
        active: true,
      },
    });
    const user = await prisma.adminUser.create({
      data: {
        email: opts.email,
        passwordHash,
        name: 'Agent Smith',
        role: AdminRole.AGENT,
      },
    });
    // The login link is stored on Agent.adminUserId (Agent owns the FK), not
    // on AdminUser. Update the seeded agent to point at this fresh login.
    await prisma.agent.update({
      where: { id: opts.agentId },
      data: { adminUserId: user.id },
    });
    const jwt = app.get(JwtService);
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        agentId: opts.agentId,
      },
      { secret: process.env.JWT_ADMIN_ACCESS_SECRET, expiresIn: '15m' },
    );
  }

  function validInquiryBody(overrides: Record<string, unknown> = {}) {
    return {
      type: 'general',
      name: 'Probe Tester',
      email: 'probe@example.com',
      phone: '+40700000001',
      message: 'I would like to inquire about scheduling a viewing.',
      gdprConsent: true,
      gdprConsentVersion: '2026-05-10',
      source: 'revery-contact',
      sourceUrl: 'https://reveria.com/en/contact',
      ...overrides,
    };
  }

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    mockEmail = created.mockEmail;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    const admin = await seedAdmin();
    adminToken = admin.token;
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /inquiries — public', () => {
    it('persists, returns 201, and dispatches both submitter + admin emails', async () => {
      // Setting INQUIRIES_NOTIFY_TO at runtime — the service reads from
      // ConfigService which closes over the env at module init.
      process.env.INQUIRIES_NOTIFY_TO = 'ops@reveria.com';

      const res = await request(app.getHttpServer())
        .post('/api/v1/inquiries')
        .set('X-Site', 'REVERY')
        .set('X-Forwarded-For', '203.0.113.10')
        .send(validInquiryBody())
        .expect(201);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe('probe@example.com');
      expect(res.body.data.consentedAt).toBeDefined();
      expect(res.body.data.gdprConsentVersion).toBe('2026-05-10');
      expect(res.body.data.siteId).toBe('REVERY');
      expect(res.body.data.app).toBe('revery');

      // Email dispatch is fire-and-forget — give the microtask queue a tick
      // so the captured emails settle before we assert.
      await new Promise((r) => setImmediate(r));
      const submitterEmails = mockEmail.captured.filter(
        (c) => c.template === 'inquiry-submitter-confirmation',
      );
      const adminEmails = mockEmail.captured.filter(
        (c) => c.template === 'inquiry-admin-alert',
      );
      expect(submitterEmails).toHaveLength(1);
      expect(submitterEmails[0]?.to).toBe('probe@example.com');
      expect(adminEmails).toHaveLength(1);
      expect(adminEmails[0]?.to).toContain('ops@reveria.com');

      delete process.env.INQUIRIES_NOTIFY_TO;
    });

    it('rejects when gdprConsent is missing', async () => {
      const body = validInquiryBody();
      delete (body as Record<string, unknown>).gdprConsent;
      await request(app.getHttpServer())
        .post('/api/v1/inquiries')
        .set('X-Site', 'REVERY')
        .set('X-Forwarded-For', '203.0.113.11')
        .send(body)
        .expect(400);
    });

    it('rejects when gdprConsent is false', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/inquiries')
        .set('X-Site', 'REVERY')
        .set('X-Forwarded-For', '203.0.113.12')
        .send(validInquiryBody({ gdprConsent: false }))
        .expect(400);
    });

    it('honeypot trap silently drops the row but returns a fabricated 201', async () => {
      const before = await prisma.inquiry.count();
      const res = await request(app.getHttpServer())
        .post('/api/v1/inquiries')
        .set('X-Site', 'REVERY')
        .set('X-Forwarded-For', '203.0.113.13')
        .send(validInquiryBody({ website: 'http://spam.example.org' }))
        .expect(201);
      expect(res.body.data.id).toBe('00000000-0000-0000-0000-000000000000');
      const after = await prisma.inquiry.count();
      expect(after).toBe(before);
    });

    it('rate-limits the 6th request from the same IP within the window', async () => {
      const ip = '203.0.113.20';
      const statuses: number[] = [];
      for (let i = 0; i < 7; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/inquiries')
          .set('X-Site', 'REVERY')
          .set('X-Forwarded-For', ip)
          .send(
            validInquiryBody({
              email: `probe-${i}@example.com`,
              message: `Probe number ${i} — exhaustively testing the limit.`,
            }),
          );
        statuses.push(res.status);
      }
      const successCount = statuses.filter((s) => s === 201).length;
      const throttled = statuses.filter((s) => s === 429).length;
      expect(successCount).toBe(5);
      expect(throttled).toBeGreaterThanOrEqual(1);
    });

    it('stamps siteId from X-Site=TGE_LUXURY when posted from landing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inquiries')
        .set('X-Site', 'TGE_LUXURY')
        .set('X-Forwarded-For', '203.0.113.30')
        .send(
          validInquiryBody({
            source: 'tge-contact',
            sourceUrl: 'https://tge.com/en/contact',
          }),
        )
        .expect(201);
      expect(res.body.data.siteId).toBe('TGE_LUXURY');
      expect(res.body.data.app).toBe('landing');
    });
  });

  describe('GET /inquiries — admin scoped', () => {
    it('returns rows for ADMIN', async () => {
      await prisma.inquiry.create({
        data: {
          name: 'A',
          email: 'a@x.test',
          message: 'Test inquiry message body',
          siteId: 'TGE_LUXURY',
          app: 'landing',
          consentedAt: new Date(),
        },
      });
      const res = await request(app.getHttpServer())
        .get('/api/v1/inquiries')
        .set('X-Site', 'ADMIN')
        .set(bearer(adminToken))
        .expect(200);
      const items = unwrap<unknown[]>(res);
      expect(items).toHaveLength(1);
    });

    it('AGENT only sees inquiries linked to their assigned properties', async () => {
      const myAgentId = '00000000-0000-0000-0000-000000000a01';
      const otherAgentId = '00000000-0000-0000-0000-000000000a02';
      const myToken = await seedAgent({
        email: 'me@agents.test',
        agentId: myAgentId,
      });
      // Other agent owns "other-prop".
      await prisma.agent.create({
        data: {
          id: otherAgentId,
          slug: otherAgentId,
          firstName: 'Other',
          lastName: 'Agent',
          email: 'other@agents.test',
          phone: '+40700000099',
          bio: { en: 'Other agent', ro: 'Alt agent' },
          active: true,
        },
      });
      const propertyDefaults = {
        currency: 'EUR',
        type: PropertyType.apartment,
        tier: PropertyTier.affordable,
        city: 'Cluj-Napoca',
        citySlug: 'cluj-napoca',
        neighborhood: 'Centru',
        address: { en: 'Test address', ro: 'Adresă de test' },
        latitude: 46.77,
        longitude: 23.6,
        bedrooms: 2,
        bathrooms: 1,
        area: 60,
        floors: 1,
        yearBuilt: 2020,
      };
      await prisma.property.createMany({
        data: [
          {
            ...propertyDefaults,
            id: '00000000-0000-0000-0000-0000000000a1',
            slug: 'mine-prop',
            title: { en: 'Mine', ro: 'Al meu' },
            shortDescription: { en: 'short', ro: 'scurt' },
            description: { en: 'desc', ro: 'desc' },
            price: 100000,
            agentId: myAgentId,
          },
          {
            ...propertyDefaults,
            id: '00000000-0000-0000-0000-0000000000a2',
            slug: 'other-prop',
            title: { en: 'Other', ro: 'Alt' },
            shortDescription: { en: 'short', ro: 'scurt' },
            description: { en: 'desc', ro: 'desc' },
            price: 100000,
            agentId: otherAgentId,
          },
        ],
      });
      await prisma.inquiry.createMany({
        data: [
          {
            name: 'Mine Inq',
            email: 'mine@inq.test',
            message: 'Inquiry on mine-prop please respond',
            propertySlug: 'mine-prop',
            siteId: 'REVERY',
            app: 'revery',
            consentedAt: new Date(),
          },
          {
            name: 'Other Inq',
            email: 'other@inq.test',
            message: 'Inquiry on other-prop please respond',
            propertySlug: 'other-prop',
            siteId: 'REVERY',
            app: 'revery',
            consentedAt: new Date(),
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .get('/api/v1/inquiries')
        .set('X-Site', 'ADMIN')
        .set(bearer(myToken))
        .expect(200);
      const items = unwrap<Array<{ name: string }>>(res);
      expect(items).toHaveLength(1);
      expect(items[0]?.name).toBe('Mine Inq');
    });
  });

  describe('DELETE soft-delete + restore', () => {
    it('DELETE flips deletedAt, default GET hides it, ?includeDeleted=1 surfaces it', async () => {
      const created = await prisma.inquiry.create({
        data: {
          name: 'Soft',
          email: 'soft@del.test',
          message: 'Soft delete probe inquiry',
          siteId: 'REVERY',
          app: 'revery',
          consentedAt: new Date(),
        },
      });
      await request(app.getHttpServer())
        .delete(`/api/v1/inquiries/${created.id}`)
        .set('X-Site', 'ADMIN')
        .set(bearer(adminToken))
        .expect(200);

      const after = await prisma.inquiry.findUnique({
        where: { id: created.id },
      });
      expect(after?.deletedAt).not.toBeNull();

      const listHidden = await request(app.getHttpServer())
        .get('/api/v1/inquiries')
        .set('X-Site', 'ADMIN')
        .set(bearer(adminToken))
        .expect(200);
      expect(unwrap<unknown[]>(listHidden)).toHaveLength(0);

      const listShown = await request(app.getHttpServer())
        .get('/api/v1/inquiries?includeDeleted=1')
        .set('X-Site', 'ADMIN')
        .set(bearer(adminToken))
        .expect(200);
      expect(unwrap<unknown[]>(listShown)).toHaveLength(1);
    });

    it('POST /:id/restore clears deletedAt and the row reappears', async () => {
      const created = await prisma.inquiry.create({
        data: {
          name: 'Restore',
          email: 'restore@del.test',
          message: 'Restore probe inquiry body text',
          siteId: 'REVERY',
          app: 'revery',
          consentedAt: new Date(),
          deletedAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/inquiries/${created.id}/restore`)
        .set('X-Site', 'ADMIN')
        .set(bearer(adminToken))
        .expect(201);

      const live = await request(app.getHttpServer())
        .get('/api/v1/inquiries')
        .set('X-Site', 'ADMIN')
        .set(bearer(adminToken))
        .expect(200);
      expect(unwrap<unknown[]>(live)).toHaveLength(1);
    });
  });
});
