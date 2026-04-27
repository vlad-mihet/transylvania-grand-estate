import './per-test-reset';
import { INestApplication } from '@nestjs/common';
import { AdminRole, InvitationStatus, PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { createTestApp, MockEmailService } from './test-app.factory';
import { InvitationsService } from '../src/invitations/invitations.service';

/**
 * Phase-1 P3-007: the hourly reminder cron must skip invitations whose
 * `bouncedAt` is set. Soft bounces stay PENDING (only hard bounces flip
 * status to BOUNCED), but a reminder to a known-bouncing inbox just produces
 * another bounce. We assert the where-clause filters them out.
 *
 * If a future refactor drops `bouncedAt: null` from the findMany filter,
 * this suite catches it.
 */
describe('Invitations — reminder cron skips soft-bounced (e2e)', () => {
  let app: INestApplication;
  let mockEmail: MockEmailService;
  let prisma: PrismaClient;
  let service: InvitationsService;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    mockEmail = created.mockEmail;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    service = app.get(InvitationsService);
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  /**
   * Seed an invitation whose `expiresAt` lands in the 23–25h reminder window.
   * `tokenHash` must be unique; we generate a real-shaped sha256 hex hash
   * (the cron rotates the token, so the original plaintext doesn't matter).
   */
  async function seedInvite(opts: {
    email: string;
    bounced: boolean;
    expiresInHours?: number;
  }) {
    const plaintext = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(plaintext).digest('hex');
    const hours = opts.expiresInHours ?? 24;
    return prisma.invitation.create({
      data: {
        email: opts.email,
        tokenHash: hash,
        role: AdminRole.AGENT,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
        emailSentAt: new Date(Date.now() - 60 * 60 * 1000),
        bouncedAt: opts.bounced ? new Date() : null,
        bounceReason: opts.bounced ? 'soft' : null,
      },
    });
  }

  it('reminder cron picks up healthy invite, skips soft-bounced one', async () => {
    const healthy = await seedInvite({
      email: 'healthy@example.com',
      bounced: false,
    });
    const bounced = await seedInvite({
      email: 'bouncy@example.com',
      bounced: true,
    });

    await service.sendExpiryReminders();

    // Only the healthy invite gets a reminder email.
    const reminders = mockEmail.captured.filter(
      (c) => c.template === 'invitation-reminder',
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0].to).toBe('healthy@example.com');

    // DB-side: only the healthy row's reminderSentAt should advance.
    const after = await prisma.invitation.findMany({
      where: { id: { in: [healthy.id, bounced.id] } },
      orderBy: { email: 'asc' },
    });
    const bouncedAfter = after.find((r) => r.id === bounced.id)!;
    const healthyAfter = after.find((r) => r.id === healthy.id)!;
    expect(bouncedAfter.reminderSentAt).toBeNull();
    expect(healthyAfter.reminderSentAt).toBeInstanceOf(Date);
    // Sanity: bounced invite stays PENDING (soft bounce).
    expect(bouncedAfter.status).toBe(InvitationStatus.PENDING);
    expect(bouncedAfter.bouncedAt).toBeInstanceOf(Date);
  });

  it('cron rotates the token on the healthy invite', async () => {
    const healthy = await seedInvite({
      email: 'healthy2@example.com',
      bounced: false,
    });
    const before = healthy.tokenHash;

    await service.sendExpiryReminders();

    const after = await prisma.invitation.findUniqueOrThrow({
      where: { id: healthy.id },
    });
    expect(after.tokenHash).not.toBe(before);
    // Reminder URL captured in the mock should be a fresh accept link.
    const captured = mockEmail.captured.find(
      (c) => c.template === 'invitation-reminder',
    );
    expect(captured?.url).toContain('token=');
  });

  it('outside the 23–25h window — no reminder', async () => {
    await seedInvite({
      email: 'too-soon@example.com',
      bounced: false,
      expiresInHours: 12, // outside window: too close to now
    });
    await seedInvite({
      email: 'too-late@example.com',
      bounced: false,
      expiresInHours: 48, // outside window: too far out
    });

    await service.sendExpiryReminders();

    const reminders = mockEmail.captured.filter(
      (c) => c.template === 'invitation-reminder',
    );
    expect(reminders).toHaveLength(0);
  });
});
