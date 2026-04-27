import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { InvitationStatus, PrismaClient } from '@prisma/client';
import { createTestApp, MockEmailService } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Phase-1 P3-006 regression. With `ensureEmailNotTaken` moved inside the
 * `$transaction` (after the atomic claim's row lock), the loser of a race
 * always reaches the `claim.count === 0` branch and surfaces a clean 409
 * `ConflictException`. The previous behavior surfaced 403 from a pre-tx
 * unique-email check OR a raw Prisma P2002 if both passed and the unique
 * constraint fired during AdminUser create.
 *
 * If a future refactor moves the email check back outside the transaction,
 * the strict 409 assertion below will flap — proving the regression.
 */
describe('Invitations — concurrent accept (e2e)', () => {
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

  function extractToken(url: string): string {
    return new URL(url).searchParams.get('token')!;
  }

  it('two parallel accepts on same token → exactly one 201, one 409, one AdminUser', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send({
        slug: 'race-target',
        firstName: 'Race',
        lastName: 'Target',
        email: 'race@example.com',
        phone: '+40700000020',
        bio: { en: 'bio', ro: 'bio' },
      })
      .expect(201);

    const captured = mockEmail.captured.find(
      (c) => c.template === 'agent-invitation',
    );
    const token = extractToken(captured!.url!);

    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/invitations/accept/password')
        .send({ token, password: 'CorrectHorse123Battery' }),
      request(app.getHttpServer())
        .post('/api/v1/invitations/accept/password')
        .send({ token, password: 'CorrectHorse123Battery' }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses[0]).toBe(201);
    expect(statuses[1]).toBe(409); // strict — no 403, no 500.

    // DB invariants: one ACCEPTED row, one AdminUser, one non-null adminUserId
    // on the Agent. The race must not leave partial state behind.
    const invitations = await prisma.invitation.count({
      where: { status: InvitationStatus.ACCEPTED },
    });
    expect(invitations).toBe(1);
    const users = await prisma.adminUser.count({
      where: { email: 'race@example.com' },
    });
    expect(users).toBe(1);
    const linkedAgent = await prisma.agent.findFirst({
      where: { email: 'race@example.com' },
    });
    expect(linkedAgent?.adminUserId).not.toBeNull();
  });

  it('serial accept (control) — first 201, second 404 (token consumed)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations/agents')
      .set(bearer(admin.accessToken))
      .send({
        slug: 'serial-target',
        firstName: 'Serial',
        lastName: 'Target',
        email: 'serial@example.com',
        phone: '+40700000021',
        bio: { en: 'bio', ro: 'bio' },
      })
      .expect(201);

    const token = extractToken(
      mockEmail.captured.find((c) => c.template === 'agent-invitation')!.url!,
    );

    await request(app.getHttpServer())
      .post('/api/v1/invitations/accept/password')
      .send({ token, password: 'CorrectHorse123Battery' })
      .expect(201);

    // After the token is consumed, `findValidByToken` finds the row but its
    // status is ACCEPTED → 410 Gone ("Invitation has already been used").
    // The deterministic post-race path: distinct from the race-loser's 409
    // (which fires when two requests are in flight and both see PENDING).
    await request(app.getHttpServer())
      .post('/api/v1/invitations/accept/password')
      .send({ token, password: 'AnotherPasswordX9' })
      .expect(410);
  });
});
