import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AdminRole, PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Phase-1 P2-005: every admin "Create" page now wires a `useEffect` permission
 * gate that redirects unauthorized roles to /403. The API guards are the
 * authoritative check; this spec proves them on every create surface.
 *
 * For each endpoint we assert:
 *   - AGENT  POST → 403 (role guard rejects).
 *   - SUPER_ADMIN POST with empty body → 400 (validation pipe ran, proving
 *     the authz layer waved the privileged role through).
 *
 * EDITOR's grid is covered by `editor-catalog-readonly.e2e-spec.ts`. Together
 * they form the role × create-endpoint matrix.
 */
describe('Permissions — page-guard parity at API contract level (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: { accessToken: string };
  let agentToken: string;
  let courseId: string;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    admin = await seedSuperAdminAndAccessToken(app, prisma);

    const passwordHash = await bcrypt.hash('ignored', 4);
    const agentUser = await prisma.adminUser.create({
      data: {
        email: 'agent-pg@test',
        passwordHash,
        name: 'Agent PG',
        role: AdminRole.AGENT,
      },
    });
    const agent = await prisma.agent.create({
      data: {
        slug: 'agent-pg',
        firstName: 'Agent',
        lastName: 'PG',
        email: 'agent-pg@test.local',
        phone: '+40700000050',
        bio: { en: 'bio', ro: 'bio' },
        active: true,
        adminUserId: agentUser.id,
      },
    });

    agentToken = app.get(JwtService).sign(
      {
        sub: agentUser.id,
        email: agentUser.email,
        role: agentUser.role,
        agentId: agent.id,
      },
      { secret: process.env.JWT_ADMIN_ACCESS_SECRET, expiresIn: '15m' },
    );

    // Need a course id to exercise the nested lessons create endpoint.
    const course = await prisma.course.create({
      data: {
        slug: 'pg-course',
        title: { ro: 'PG' },
        description: { ro: 'PG' },
        status: 'draft',
        visibility: 'enrolled',
      },
    });
    courseId = course.id;
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  /**
   * Every create endpoint the admin UI surfaces, paired with whether AGENT
   * is on the role allowlist. Admin/super_admin own all of these; AGENT
   * never does (the ownership-bound carve-out for property update is on
   * PATCH, not POST).
   */
  function createEndpoints(): Array<{ name: string; path: string }> {
    return [
      { name: 'property.create', path: '/api/v1/properties' },
      { name: 'agent.create', path: '/api/v1/agents' },
      { name: 'developer.create', path: '/api/v1/developers' },
      { name: 'city.create', path: '/api/v1/cities' },
      { name: 'testimonial.create', path: '/api/v1/testimonials' },
      { name: 'bank-rate.create', path: '/api/v1/financial-data/bank-rates' },
      { name: 'academy.course.create', path: '/api/v1/admin/academy/courses' },
      {
        name: 'academy.lesson.create',
        path: `/api/v1/admin/academy/courses/${'__COURSE__'}/lessons`,
      },
      { name: 'article.create', path: '/api/v1/articles' },
    ];
  }

  function withCourseId(path: string): string {
    return path.replace('__COURSE__', courseId);
  }

  it.each(createEndpoints())(
    'AGENT POST $name → 403',
    async ({ path }) => {
      await request(app.getHttpServer())
        .post(withCourseId(path))
        .set(bearer(agentToken))
        .set('X-Site', 'ADMIN')
        .send({})
        .expect(403);
    },
  );

  it.each(createEndpoints())(
    'SUPER_ADMIN POST $name with empty body → 400 (authz passed, validation kicked in)',
    async ({ path }) => {
      const res = await request(app.getHttpServer())
        .post(withCourseId(path))
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN')
        .send({});
      // Most controllers surface a 400 from class-validator/Zod. A few might
      // return 422 in some setups; either is acceptable evidence that authz
      // passed. The key invariant: NOT 403.
      expect([400, 422]).toContain(res.status);
    },
  );

  it('AGENT POST /invitations/agents → 403 (admin-only invite flow)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .send({})
      .expect(403);
  });

  it('AGENT GET /auth/users → 403 (SUPER_ADMIN-only listing)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/users')
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .expect(403);
  });

  it('AGENT PATCH /financial-data/indicators/IRCC → 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/financial-data/indicators/IRCC')
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .send({ value: 5.2 })
      .expect(403);
  });

  it('AGENT PATCH /site-config → 403', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/site-config')
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .send({ name: 'evil' })
      .expect(403);
  });
});
