import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AdminRole, PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Regression guard for Phase-1 P1-004. EDITOR holds read access on every
 * catalog resource so the sidebar shows them, but mutate verbs are gated to
 * ADMIN+. The admin UI hides Create/Edit/Delete controls; this spec proves
 * the API rejects the same calls if the UI ever leaks them. Academy is
 * special-cased: EDITOR can create/update courses + lessons but not delete.
 *
 * The bodies sent here are intentionally empty `{}` — Roles guard fires
 * before the validation pipe, so a 403 here is the role gate working. If a
 * future refactor moves validation in front of guards, the assertion shape
 * (looking for 403 specifically) will fail and surface the regression.
 */
describe('Catalog — EDITOR read-only enforcement (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: { accessToken: string };
  let editorToken: string;
  let agentToken: string;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    admin = await seedSuperAdminAndAccessToken(app, prisma);

    const passwordHash = await bcrypt.hash('ignored', 4);
    const editor = await prisma.adminUser.create({
      data: {
        email: 'editor@test',
        passwordHash,
        name: 'Editor',
        role: AdminRole.EDITOR,
      },
    });
    const agentUser = await prisma.adminUser.create({
      data: {
        email: 'agent@test',
        passwordHash,
        name: 'Agent',
        role: AdminRole.AGENT,
      },
    });
    const agent = await prisma.agent.create({
      data: {
        slug: 'agent-x',
        firstName: 'Agent',
        lastName: 'X',
        email: 'agent-x@test.local',
        phone: '+40700000099',
        bio: { en: 'bio', ro: 'bio' },
        active: true,
        adminUserId: agentUser.id,
      },
    });

    const jwt = app.get(JwtService);
    editorToken = jwt.sign(
      {
        sub: editor.id,
        email: editor.email,
        role: editor.role,
        agentId: null,
      },
      { secret: process.env.JWT_ADMIN_ACCESS_SECRET, expiresIn: '15m' },
    );
    agentToken = jwt.sign(
      {
        sub: agentUser.id,
        email: agentUser.email,
        role: agentUser.role,
        agentId: agent.id,
      },
      { secret: process.env.JWT_ADMIN_ACCESS_SECRET, expiresIn: '15m' },
    );
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // Endpoints where EDITOR is on the deny list. Each row exercises the verb
  // the admin UI would call on Save/Delete. Bodies are empty so 403 from the
  // role guard reads cleanly even if validation tightens later.
  const DENIED: Array<{ method: 'post' | 'patch' | 'delete'; path: string }> = [
    { method: 'post', path: '/api/v1/properties' },
    { method: 'patch', path: '/api/v1/properties/00000000-0000-0000-0000-000000000000' },
    { method: 'delete', path: '/api/v1/properties/00000000-0000-0000-0000-000000000000' },
    { method: 'post', path: '/api/v1/agents' },
    { method: 'patch', path: '/api/v1/agents/00000000-0000-0000-0000-000000000000' },
    { method: 'delete', path: '/api/v1/agents/00000000-0000-0000-0000-000000000000' },
    { method: 'post', path: '/api/v1/developers' },
    { method: 'patch', path: '/api/v1/developers/00000000-0000-0000-0000-000000000000' },
    { method: 'delete', path: '/api/v1/developers/00000000-0000-0000-0000-000000000000' },
    { method: 'post', path: '/api/v1/cities' },
    { method: 'patch', path: '/api/v1/cities/00000000-0000-0000-0000-000000000000' },
    { method: 'delete', path: '/api/v1/cities/00000000-0000-0000-0000-000000000000' },
    { method: 'post', path: '/api/v1/testimonials' },
    { method: 'patch', path: '/api/v1/testimonials/00000000-0000-0000-0000-000000000000' },
    { method: 'delete', path: '/api/v1/testimonials/00000000-0000-0000-0000-000000000000' },
    { method: 'post', path: '/api/v1/financial-data/bank-rates' },
    { method: 'patch', path: '/api/v1/financial-data/bank-rates/00000000-0000-0000-0000-000000000000' },
    { method: 'delete', path: '/api/v1/financial-data/bank-rates/00000000-0000-0000-0000-000000000000' },
    { method: 'patch', path: '/api/v1/financial-data/indicators/IRCC' },
    { method: 'patch', path: '/api/v1/site-config' },
  ];

  it.each(DENIED)(
    'EDITOR $method $path → 403',
    async ({ method, path }) => {
      const req = request(app.getHttpServer())
        [method](path)
        .set(bearer(editorToken))
        .set('X-Site', 'ADMIN')
        .send({});
      await req.expect(403);
    },
  );

  // Read access: same paths' GET equivalents must still reach the service.
  // We only assert "not 403"; the controllers surface 200 (list) or 404
  // (single id) depending on shape. A 403 here would mean the role gate is
  // overreaching and the sidebar is now lying to the user about visibility.
  const READS = [
    '/api/v1/properties?limit=1',
    '/api/v1/agents?limit=1',
    '/api/v1/developers?limit=1',
    '/api/v1/cities?limit=1',
    '/api/v1/testimonials?limit=1',
    '/api/v1/financial-data/bank-rates?limit=1',
    '/api/v1/financial-data/indicators',
    '/api/v1/site-config',
  ];

  it.each(READS)('EDITOR GET %s → not 403', async (path) => {
    const res = await request(app.getHttpServer())
      .get(path)
      .set(bearer(editorToken))
      .set('X-Site', 'ADMIN');
    expect(res.status).not.toBe(403);
  });

  // Academy carve-out: EDITOR can author courses+lessons but only ADMIN+
  // can delete them. Empty body POST returns 400 (validation), not 403 —
  // proves the role guard waved EDITOR through and the validation pipe ran.
  describe('academy — EDITOR can author, only ADMIN+ can delete', () => {
    it('EDITOR POST /admin/academy/courses with empty body → 400 (not 403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/academy/courses')
        .set(bearer(editorToken))
        .set('X-Site', 'ADMIN')
        .send({});
      expect(res.status).toBe(400);
    });

    it('AGENT POST /admin/academy/courses → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/academy/courses')
        .set(bearer(agentToken))
        .set('X-Site', 'ADMIN')
        .send({})
        .expect(403);
    });

    it('EDITOR DELETE /admin/academy/courses/:id → 403 (ADMIN+ only)', async () => {
      const course = await prisma.course.create({
        data: {
          slug: 'temp-course',
          title: { ro: 'Temp' },
          description: { ro: 'Temp' },
          status: 'draft',
          visibility: 'enrolled',
        },
      });
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/academy/courses/${course.id}`)
        .set(bearer(editorToken))
        .set('X-Site', 'ADMIN')
        .expect(403);
      const stillThere = await prisma.course.findUnique({
        where: { id: course.id },
      });
      expect(stillThere).not.toBeNull();
    });

    it('SUPER_ADMIN DELETE /admin/academy/courses/:id → success (control)', async () => {
      const course = await prisma.course.create({
        data: {
          slug: 'temp-course-2',
          title: { ro: 'Temp' },
          description: { ro: 'Temp' },
          status: 'draft',
          visibility: 'enrolled',
        },
      });
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/admin/academy/courses/${course.id}`)
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN');
      expect([200, 204]).toContain(res.status);
      const gone = await prisma.course.findUnique({
        where: { id: course.id },
      });
      expect(gone).toBeNull();
    });
  });
});
