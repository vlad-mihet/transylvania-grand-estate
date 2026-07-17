import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AdminRole, PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Regression net for the verify-sweep-2026-07 fix waves. These four defects all
 * pass typecheck yet break real admin flows, and two of them (BUG-202/204) are
 * repeat regressions of the strict-schema / limit-cap class — so they get a
 * spec to stop a third recurrence.
 *
 * BUG-202: `listUsersSchema` + `listInvitationsSchema` were `.strict()`, so the
 *   admin client's cross-cutting `expand=allLocales` param 400'd → the People
 *   team page and Invitations page rendered empty / dead.
 * BUG-204: `queryInquirySchema` inherited `paginationSchema`'s `max(100)`, but
 *   the inquiries kanban pulls the whole board with `limit=200` → 400 → dead
 *   error card.
 * BUG-208: EDITOR was absent from the inquiries read endpoints, so the Cereri
 *   section the sidebar shows them 403'd on every call.
 * BUG-209: EDITOR could read the global audit trail (cross-entity operational
 *   metadata + other admins' emails). Now ADMIN+ only.
 */
describe('verify-sweep-2026-07 regressions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let editorToken: string;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    ({ accessToken: adminToken } = await seedSuperAdminAndAccessToken(
      app,
      prisma,
    ));

    const passwordHash = await bcrypt.hash('ignored', 4);
    const editor = await prisma.adminUser.create({
      data: {
        email: 'editor@test',
        passwordHash,
        name: 'Editor',
        role: AdminRole.EDITOR,
      },
    });
    editorToken = app.get(JwtService).sign(
      { sub: editor.id, email: editor.email, role: editor.role, agentId: null },
      { secret: process.env.JWT_ADMIN_ACCESS_SECRET, expiresIn: '15m' },
    );
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const get = (path: string, token: string) =>
    request(app.getHttpServer())
      .get(path)
      .set(bearer(token))
      .set('X-Site', 'ADMIN');

  it('BUG-202: /auth/users tolerates the client expand param', async () => {
    await get('/api/v1/auth/users?limit=100&expand=allLocales', adminToken).expect(
      200,
    );
  });

  it('BUG-202: /invitations tolerates the client expand param', async () => {
    await get('/api/v1/invitations?limit=20&expand=allLocales', adminToken).expect(
      200,
    );
  });

  it('BUG-204: /inquiries accepts the kanban limit=200', async () => {
    await get('/api/v1/inquiries?limit=200', adminToken).expect(200);
  });

  it('BUG-208: EDITOR may read inquiries', async () => {
    await get('/api/v1/inquiries?limit=20', editorToken).expect(200);
  });

  it('BUG-209: EDITOR may NOT read the global audit trail', async () => {
    await get('/api/v1/audit-logs?limit=10', editorToken).expect(403);
  });
});
