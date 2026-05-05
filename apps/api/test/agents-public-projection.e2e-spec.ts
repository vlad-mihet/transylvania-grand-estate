import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import {
  AdminRole,
  InvitationStatus,
  PrismaClient,
  PropertyStatus,
  PropertyTier,
  PropertyType,
} from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Public-projection guard for the Agent surface. Anonymous + AGENT-role
 * callers must never see `email`, `adminUserId`, `invitation`, or
 * timestamps — these are admin-only fields. Trusted callers
 * (ADMIN/SUPER_ADMIN/EDITOR) keep getting the full row. The /agents/me
 * route is the one exception for AGENT: they can read their own email.
 *
 * If a future change re-introduces `agent: true` somewhere on a public
 * path, or removes the role guard on /agents, this suite fails loudly
 * before the leak ships.
 */
describe('Agents — public projection (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: { accessToken: string };
  let agentToken: string;
  let editorToken: string;
  let agentRecord: { id: string; slug: string };
  let propertySlug: string;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    admin = await seedSuperAdminAndAccessToken(app, prisma);

    // AdminUser linked to the sales agent — exercises the adminUserId field
    // in the admin projection and powers the AGENT bearer token.
    const passwordHash = await bcrypt.hash('ignored', 4);
    const agentUser = await prisma.adminUser.create({
      data: {
        email: 'agent-pii@test',
        passwordHash,
        name: 'Agent PII',
        role: AdminRole.AGENT,
      },
    });
    const agent = await prisma.agent.create({
      data: {
        slug: 'agent-pii',
        firstName: 'Pii',
        lastName: 'Agent',
        email: 'pii-agent@test.local',
        phone: '+40700000123',
        bio: { en: 'bio', ro: 'bio' },
        active: true,
        adminUserId: agentUser.id,
      },
    });
    agentRecord = { id: agent.id, slug: agent.slug };

    // PENDING invitation — drives the `invitation` field that admin
    // callers see and public callers must not.
    await prisma.invitation.create({
      data: {
        agentId: agent.id,
        email: 'pii-agent@test.local',
        tokenHash: 'tok-hash-projection-spec',
        role: AdminRole.AGENT,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    // One affordable property attached so REVERY-scoped requests succeed.
    const county = await prisma.county.upsert({
      where: { slug: 'cluj' },
      update: {},
      create: {
        name: 'Cluj',
        slug: 'cluj',
        code: 'CJ',
        latitude: 46.77,
        longitude: 23.6,
      },
    });
    const city = await prisma.city.upsert({
      where: { slug: 'cluj-napoca' },
      update: {},
      create: {
        name: 'Cluj-Napoca',
        slug: 'cluj-napoca',
        description: { en: 'c', ro: 'c' },
        image: '/uploads/placeholder-city.png',
        countyId: county.id,
      },
    });
    const property = await prisma.property.create({
      data: {
        slug: 'pii-prop',
        title: { en: 'T', ro: 'T' },
        description: { en: 'D', ro: 'D' },
        shortDescription: { en: 'S', ro: 'S' },
        price: 250_000,
        currency: 'EUR',
        type: PropertyType.apartment,
        status: PropertyStatus.available,
        tier: PropertyTier.affordable,
        city: 'Cluj-Napoca',
        citySlug: 'cluj-napoca',
        cityId: city.id,
        neighborhood: 'Centru',
        address: { en: 'Str.', ro: 'Str.' },
        latitude: 46.77,
        longitude: 23.6,
        bedrooms: 2,
        bathrooms: 1,
        area: 80,
        floors: 1,
        yearBuilt: 2015,
        featured: false,
        isNew: false,
        agentId: agent.id,
        features: [],
      },
    });
    propertySlug = property.slug;

    const editorUser = await prisma.adminUser.create({
      data: {
        email: 'editor-pii@test',
        passwordHash,
        name: 'Editor PII',
        role: AdminRole.EDITOR,
      },
    });

    const jwt = app.get(JwtService);
    agentToken = jwt.sign(
      {
        sub: agentUser.id,
        email: agentUser.email,
        role: agentUser.role,
        agentId: agent.id,
      },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
    editorToken = jwt.sign(
      {
        sub: editorUser.id,
        email: editorUser.email,
        role: editorUser.role,
        agentId: null,
      },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const ADMIN_ONLY_FIELDS = [
    'email',
    'adminUserId',
    'invitation',
    'createdAt',
    'updatedAt',
  ] as const;

  describe('anonymous caller', () => {
    it('GET /agents drops admin-only fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents?active=true')
        .set('X-Site', 'REVERY')
        .expect(200);

      const rows = res.body.data as Array<Record<string, unknown>>;
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        for (const field of ADMIN_ONLY_FIELDS) {
          expect(row).not.toHaveProperty(field);
        }
        // Sanity: still has the public fields the UI needs.
        expect(row).toHaveProperty('phone');
        expect(row).toHaveProperty('firstName');
        expect(row).toHaveProperty('slug');
      }
    });

    it('GET /agents/:slug drops email', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/agents/${agentRecord.slug}`)
        .set('X-Site', 'REVERY')
        .expect(200);

      for (const field of ADMIN_ONLY_FIELDS) {
        expect(res.body.data).not.toHaveProperty(field);
      }
    });

    it('GET /agents/id/:id drops email', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/agents/id/${agentRecord.id}`)
        .set('X-Site', 'REVERY')
        .expect(200);

      for (const field of ADMIN_ONLY_FIELDS) {
        expect(res.body.data).not.toHaveProperty(field);
      }
    });

    it('GET /properties/:slug embeds agent without email', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/properties/${propertySlug}`)
        .set('X-Site', 'REVERY')
        .expect(200);

      const agent = res.body.data.agent as Record<string, unknown>;
      expect(agent).toBeDefined();
      expect(agent).not.toHaveProperty('email');
      // Phone is preserved — UIs mask it client-side via reveal-on-click.
      expect(agent).toHaveProperty('phone');
    });

    it('GET /agents?unlinked=true → 403 for anonymous', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/agents?unlinked=true')
        .set('X-Site', 'ADMIN')
        .expect(403);
    });

    it('GET /agents?unlinked=false is treated as no-filter (200, not 403)', async () => {
      // Regression: the literal string "false" is JS-truthy. Strict parsing
      // ensures only `unlinked=true` triggers the admin-only branch — anything
      // else (including the explicit "false") falls through to the normal
      // public list.
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents?unlinked=false')
        .set('X-Site', 'REVERY')
        .expect(200);

      const rows = res.body.data as Array<Record<string, unknown>>;
      expect(rows.length).toBeGreaterThan(0);
    });

    it('GET /agents?search=<email> does not match by email for anonymous', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents?search=pii-agent@test.local')
        .set('X-Site', 'REVERY')
        .expect(200);

      const rows = res.body.data as Array<{ slug: string }>;
      expect(rows.find((r) => r.slug === agentRecord.slug)).toBeUndefined();
    });
  });

  describe('AGENT role', () => {
    it('GET /agents returns the public projection (no email on others)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents')
        .set(bearer(agentToken))
        .set('X-Site', 'ADMIN')
        .expect(200);

      const rows = res.body.data as Array<Record<string, unknown>>;
      for (const row of rows) {
        for (const field of ADMIN_ONLY_FIELDS) {
          expect(row).not.toHaveProperty(field);
        }
      }
    });

    it('GET /agents/me returns the full admin projection (incl. email)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents/me')
        .set(bearer(agentToken))
        .set('X-Site', 'ADMIN')
        .expect(200);

      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data.id).toBe(agentRecord.id);
    });

    it('GET /agents?unlinked=true → 403 for AGENT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/agents?unlinked=true')
        .set(bearer(agentToken))
        .set('X-Site', 'ADMIN')
        .expect(403);
    });

    it('GET /agents?search=<email> does not match by email for AGENT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents?search=pii-agent@test.local')
        .set(bearer(agentToken))
        .set('X-Site', 'ADMIN')
        .expect(200);

      const rows = res.body.data as Array<{ slug: string }>;
      expect(rows.find((r) => r.slug === agentRecord.slug)).toBeUndefined();
    });
  });

  describe('EDITOR role', () => {
    it('GET /agents returns the admin projection (incl. email)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents?active=true')
        .set(bearer(editorToken))
        .set('X-Site', 'ADMIN')
        .expect(200);

      const target = (res.body.data as Array<Record<string, unknown>>).find(
        (r) => (r as { slug?: string }).slug === agentRecord.slug,
      );
      expect(target).toBeDefined();
      expect(target).toHaveProperty('email', 'pii-agent@test.local');
      expect(target).toHaveProperty('adminUserId');
      expect(target).toHaveProperty('invitation');
    });

    it('GET /agents?search=<email> matches by email for EDITOR', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents?search=pii-agent@test.local')
        .set(bearer(editorToken))
        .set('X-Site', 'ADMIN')
        .expect(200);

      const rows = res.body.data as Array<{ slug: string }>;
      expect(rows.find((r) => r.slug === agentRecord.slug)).toBeDefined();
    });

    it('GET /agents?unlinked=true → 200 for EDITOR', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/agents?unlinked=true')
        .set(bearer(editorToken))
        .set('X-Site', 'ADMIN')
        .expect(200);
    });
  });

  describe('SUPER_ADMIN role', () => {
    it('GET /agents returns the full admin projection (email + invitation)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents?active=true')
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN')
        .expect(200);

      const rows = res.body.data as Array<Record<string, unknown>>;
      const target = rows.find(
        (r) => (r as { slug?: string }).slug === agentRecord.slug,
      );
      expect(target).toBeDefined();
      expect(target).toHaveProperty('email', 'pii-agent@test.local');
      expect(target).toHaveProperty('adminUserId');
      expect(target).toHaveProperty('invitation');
      expect((target as { invitation: { status: string } }).invitation.status)
        .toBe(InvitationStatus.PENDING);
    });

    it('GET /agents?unlinked=true → 200 for SUPER_ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/agents?unlinked=true')
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN')
        .expect(200);
    });

    it('GET /agents?unlinked=false does not collapse to unlinked-only', async () => {
      // The seeded agent is linked (adminUserId is set). With strict parsing,
      // `unlinked=false` is a no-op — the admin still sees the linked agent.
      // Pre-fix, the truthy-string bug would have hidden them.
      const res = await request(app.getHttpServer())
        .get('/api/v1/agents?unlinked=false')
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN')
        .expect(200);

      const rows = res.body.data as Array<{ slug: string; adminUserId?: string | null }>;
      const target = rows.find((r) => r.slug === agentRecord.slug);
      expect(target).toBeDefined();
      expect(target?.adminUserId).toBeTruthy();
    });

    it('GET /properties/:slug embeds agent.email for SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/properties/${propertySlug}`)
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN')
        .expect(200);

      const agent = res.body.data.agent as Record<string, unknown>;
      expect(agent).toHaveProperty('email', 'pii-agent@test.local');
    });
  });
});
