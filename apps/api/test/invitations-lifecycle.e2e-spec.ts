import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient, InvitationStatus } from '@prisma/client';
import { createTestApp, MockEmailService } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

describe('Invitations \u2014 lifecycle (e2e)', () => {
  let app: INestApplication;
  let mockEmail: MockEmailService;
  let prisma: PrismaClient;
  let admin: { accessToken: string };

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    mockEmail = created.mockEmail;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    admin = await seedSuperAdminAndAccessToken(app, prisma);
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const payload = {
    slug: 'alex-iones',
    firstName: 'Alex',
    lastName: 'Iones',
    email: 'alex@example.com',
    phone: '+40712345678',
    bio: { en: 'b', ro: 'b' },
  };

  it('resend regenerates the token \u2014 old link becomes unknown', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send(payload);
    const originalToken = new URL(mockEmail.captured[0].url!).searchParams.get(
      'token',
    )!;

    const list = await request(app.getHttpServer())
      .get('/api/v1/invitations')
      .set(bearer(admin.accessToken));
    const inv = list.body.data[0];

    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${inv.id}/resend`)
      .set(bearer(admin.accessToken))
      .expect(201);
    const newToken = new URL(mockEmail.captured[1].url!).searchParams.get(
      'token',
    )!;
    expect(newToken).not.toBe(originalToken);

    // Original token is gone: sha256 of a different plaintext no longer maps
    // to any row.
    await request(app.getHttpServer())
      .get(`/api/v1/invitations/verify?token=${originalToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/invitations/verify?token=${newToken}`)
      .expect(200);
  });

  it('expireStale cron flips PENDING \u2192 EXPIRED', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send(payload);
    await prisma.invitation.updateMany({
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    // Drive the cron handler directly (avoid waiting for schedule).
    const svc = app.get(
      // Dynamic require to dodge circular-import complaints in the test file.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../src/invitations/invitations.service').InvitationsService,
    );
    await svc.expireStale();

    const rows = await prisma.invitation.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(InvitationStatus.EXPIRED);
  });
});
