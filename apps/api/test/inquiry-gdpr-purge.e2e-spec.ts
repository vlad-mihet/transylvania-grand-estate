import './per-test-reset';
import { INestApplication } from '@nestjs/common';
import { InquiryType, InquiryStatus, PrismaClient } from '@prisma/client';
import { createTestApp } from './test-app.factory';
import { InquiriesService } from '../src/inquiries/inquiries.service';

/**
 * Regression for BUG-108 (2026-07 sweep): inquiry `remove()` only soft-deleted
 * (set `deletedAt`) and the promised GDPR 90-day hard-purge cron did not
 * exist, so soft-deleted PII was retained forever. `purgeSoftDeleted()` now
 * hard-deletes rows past the retention window. Drives the service method
 * directly (the @Cron schedule only fires at 3AM).
 */
describe('Inquiry GDPR purge (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let service: InquiriesService;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    service = app.get(InquiriesService);
    await prisma.inquiry.deleteMany({});
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const DAY = 24 * 60 * 60 * 1000;

  async function makeInquiry(overrides: {
    email: string;
    deletedAt: Date | null;
  }): Promise<string> {
    const row = await prisma.inquiry.create({
      data: {
        type: InquiryType.general,
        status: InquiryStatus.new,
        name: 'QA',
        email: overrides.email,
        message: 'purge-window probe',
        marketingConsent: false,
        deletedAt: overrides.deletedAt,
      },
    });
    return row.id;
  }

  it('hard-purges inquiries soft-deleted past the 90-day window', async () => {
    const old = await makeInquiry({
      email: 'old@purge.test',
      deletedAt: new Date(Date.now() - 91 * DAY),
    });
    const recent = await makeInquiry({
      email: 'recent@purge.test',
      deletedAt: new Date(Date.now() - 10 * DAY),
    });
    const live = await makeInquiry({
      email: 'live@purge.test',
      deletedAt: null,
    });

    await service.purgeSoftDeleted();

    expect(await prisma.inquiry.findUnique({ where: { id: old } })).toBeNull();
    expect(
      await prisma.inquiry.findUnique({ where: { id: recent } }),
    ).not.toBeNull();
    expect(await prisma.inquiry.findUnique({ where: { id: live } })).not.toBeNull();
  });

  it('is a no-op when nothing is past the window', async () => {
    await makeInquiry({ email: 'a@purge.test', deletedAt: null });
    await service.purgeSoftDeleted();
    expect(await prisma.inquiry.count()).toBe(1);
  });
});
