import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTestApp, MockEmailService } from './test-app.factory';
import {
  SUPER_ADMIN_EMAIL,
  bearer,
  seedSuperAdminAndAccessToken,
  unwrap,
} from './fixtures';

/**
 * End-to-end: invite an agent, capture the emailed URL, accept with a
 * password, then verify the returned JWT actually logs in as that agent.
 * Also covers the security guardrails: weak passwords, expired tokens,
 * revoked tokens, and the double-accept race.
 */
describe('Invitations \u2014 password path (e2e)', () => {
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

  const validPayload = {
    slug: 'maria-popescu',
    firstName: 'Maria',
    lastName: 'Popescu',
    email: 'maria@example.com',
    phone: '+40712345678',
    bio: { en: 'bio', ro: 'bio' },
  };

  function extractToken(url: string): string {
    const u = new URL(url);
    return u.searchParams.get('token')!;
  }

  it('invite \u2192 accept password \u2192 login with new credentials', async () => {
    const invite = await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send(validPayload)
      .expect(201);
    expect(invite.body.data.emailDelivered).toBe(true);

    const captured = mockEmail.captured.find(
      (c) => c.template === 'agent-invitation',
    );
    expect(captured).toBeDefined();
    const token = extractToken(captured!.url!);

    const verify = await request(app.getHttpServer())
      .get(`/api/v1/invitations/verify?token=${token}`)
      .expect(200);
    expect(unwrap<{ email: string }>(verify).email).toBe(validPayload.email);

    const accept = await request(app.getHttpServer())
      .post('/api/v1/invitations/accept/password')
      .send({ token, password: 'CorrectHorse123Battery' })
      .expect(201);
    const tokens = unwrap<{
      accessToken: string;
      user: { email: string; role: string };
    }>(accept);
    expect(tokens.user.email).toBe(validPayload.email);
    expect(tokens.user.role).toBe('AGENT');

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: validPayload.email, password: 'CorrectHorse123Battery' })
      .expect(201);
    expect(unwrap<{ user: { email: string } }>(login).user.email).toBe(
      validPayload.email,
    );
  });

  it('weak password \u2192 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send(validPayload);
    const token = extractToken(mockEmail.captured[0].url!);

    await request(app.getHttpServer())
      .post('/api/v1/invitations/accept/password')
      .send({ token, password: 'short' })
      .expect(400);
  });

  it('revoked invitation accept \u2192 404', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send(validPayload);
    const token = extractToken(mockEmail.captured[0].url!);

    // find + revoke via the admin endpoint
    const list = await request(app.getHttpServer())
      .get('/api/v1/invitations')
      .set(bearer(admin.accessToken));
    const inv = list.body.data.data[0];
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${inv.id}/revoke`)
      .set(bearer(admin.accessToken))
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/invitations/accept/password')
      .send({ token, password: 'CorrectHorse123Battery' })
      .expect(404);
  });

  it('expired invitation accept \u2192 410', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send(validPayload);
    const token = extractToken(mockEmail.captured[0].url!);

    await prisma.invitation.updateMany({
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await request(app.getHttpServer())
      .post('/api/v1/invitations/accept/password')
      .send({ token, password: 'CorrectHorse123Battery' })
      .expect(410);
  });

  it('double-accept race \u2192 one succeeds, one 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send(validPayload);
    const token = extractToken(mockEmail.captured[0].url!);

    const [a, b] = await Promise.allSettled([
      request(app.getHttpServer())
        .post('/api/v1/invitations/accept/password')
        .send({ token, password: 'CorrectHorse123Battery' }),
      request(app.getHttpServer())
        .post('/api/v1/invitations/accept/password')
        .send({ token, password: 'CorrectHorse123Battery' }),
    ]);
    const statuses = [a, b]
      .map((r) => (r.status === 'fulfilled' ? r.value.status : 500))
      .sort();
    // One accept created the user (201), the other lost the race (409 from
    // our updateMany guard or 403 if the unique-email constraint fired).
    expect(statuses[0]).toBe(201);
    expect([403, 409]).toContain(statuses[1]);
  });

  // Harness sanity \u2014 confirms the seeded super admin wasn't accidentally
  // overwritten by the invitation flow creating a new AdminUser.
  it('super admin still exists after flow', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send(validPayload);
    const still = await prisma.adminUser.findUnique({
      where: { email: SUPER_ADMIN_EMAIL },
    });
    expect(still).not.toBeNull();
  });
});
