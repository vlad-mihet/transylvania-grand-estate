import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import {
  AdminRole,
  AdminUserStatus,
  ArticleStatus,
  InvitationStatus,
  PrismaClient,
} from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Phase 1 — admin Dashboard "What needs attention" aggregator.
 *
 * Covers role-based field gating: every admin role can see baseline counts
 * (newInquiries, draftArticles, missingEnTotal); pendingAcademyInvitations
 * requires ADMIN+; suspendedUsers and auditFailuresSinceBoot require
 * SUPER_ADMIN. Forbidden fields are returned as `null` rather than omitted
 * so the wire shape stays stable for the front end.
 */
describe('GET /admin/dashboard/attention (e2e)', () => {
  const ENDPOINT = '/api/v1/admin/dashboard/attention';

  let app: INestApplication;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    // The shared per-test-reset list omits articles, cities, and testimonials;
    // localeCompleteness scans them so prior suites can leak counts. Reset
    // proactively to keep the seeded counts deterministic.
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "articles", "cities", "testimonials" RESTART IDENTITY CASCADE;',
    );
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function seedTokenForRole(role: AdminRole): Promise<string> {
    const passwordHash = await bcrypt.hash('ignored', 4);
    const user = await prisma.adminUser.create({
      data: {
        email: `${role.toLowerCase()}@test`,
        passwordHash,
        name: `${role} Test`,
        role,
      },
    });
    const jwt = app.get(JwtService);
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        agentId: null,
      },
      { secret: process.env.JWT_ADMIN_ACCESS_SECRET, expiresIn: '15m' },
    );
  }

  describe('auth & role gating', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set('X-Site', 'ADMIN');
      expect(res.status).toBe(401);
    });

    it('rejects AGENT role with 403', async () => {
      const agentToken = await seedTokenForRole(AdminRole.AGENT);
      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(agentToken))
        .set('X-Site', 'ADMIN');
      expect(res.status).toBe(403);
    });

    it('lets SUPER_ADMIN through with 200', async () => {
      const admin = await seedSuperAdminAndAccessToken(app, prisma);
      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN');
      expect(res.status).toBe(200);
    });
  });

  describe('field gating per role', () => {
    it('returns all six fields for SUPER_ADMIN with seeded counts', async () => {
      const admin = await seedSuperAdminAndAccessToken(app, prisma);

      // 2 new inquiries
      await prisma.inquiry.createMany({
        data: [
          { name: 'Alice', email: 'alice@test', message: 'Hi 1' },
          { name: 'Bob', email: 'bob@test', message: 'Hi 2' },
        ],
      });
      // 1 draft article (full RO+EN so it doesn't add to missingEnTotal)
      await prisma.article.create({
        data: {
          slug: 'draft-art',
          status: ArticleStatus.draft,
          title: { ro: 'Schiță', en: 'Draft' },
          excerpt: { ro: 'Rez', en: 'Excerpt' },
          content: { ro: 'Cont', en: 'Content' },
          coverImage: 'https://example.com/c.jpg',
          category: 'guide',
          authorName: 'A',
        },
      });
      // 1 published article missing EN — contributes to missingEnTotal
      await prisma.article.create({
        data: {
          slug: 'pub-art-no-en',
          status: ArticleStatus.published,
          title: { ro: 'Doar RO', en: '' },
          excerpt: { ro: 'Rez', en: '' },
          content: { ro: 'Cont', en: '' },
          coverImage: 'https://example.com/c2.jpg',
          category: 'news',
          authorName: 'A',
        },
      });
      // 1 pending academy invitation
      await prisma.academyInvitation.create({
        data: {
          email: 'student@test',
          tokenHash: 'pending-hash-1',
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      // 1 suspended team member (the seeded SUPER_ADMIN itself stays ACTIVE)
      const suspendedHash = await bcrypt.hash('ignored', 4);
      await prisma.adminUser.create({
        data: {
          email: 'suspended@test',
          passwordHash: suspendedHash,
          name: 'Suspended',
          role: AdminRole.EDITOR,
          status: AdminUserStatus.SUSPENDED,
        },
      });

      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN');

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.newInquiries).toBe(2);
      expect(body.draftArticles).toBe(1);
      expect(body.missingEnTotal).toBeGreaterThanOrEqual(1);
      expect(body.pendingAcademyInvitations).toBe(1);
      expect(body.suspendedUsers).toBe(1);
      // AuditHealthService starts at 0 on a fresh boot. The exact value
      // doesn't matter — only that it's a number, not null, for SUPER_ADMIN.
      expect(typeof body.auditFailuresSinceBoot).toBe('number');
    });

    it('omits suspendedUsers + auditFailuresSinceBoot for ADMIN, keeps academy', async () => {
      const adminToken = await seedTokenForRole(AdminRole.ADMIN);
      // Seed one of each so the counts that ADMIN CAN see are non-zero.
      await prisma.inquiry.create({
        data: { name: 'X', email: 'x@test', message: 'm' },
      });
      await prisma.academyInvitation.create({
        data: {
          email: 'y@test',
          tokenHash: 'pending-hash-2',
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(adminToken))
        .set('X-Site', 'ADMIN');

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.newInquiries).toBe(1);
      expect(body.draftArticles).toBe(0);
      expect(body.pendingAcademyInvitations).toBe(1);
      // SUPER_ADMIN-only fields explicitly null, not absent — the wire shape
      // stays stable so the front end can iterate uniformly.
      expect(body.suspendedUsers).toBeNull();
      expect(body.auditFailuresSinceBoot).toBeNull();
    });

    it('omits academy + suspended + audit fields for EDITOR', async () => {
      const editorToken = await seedTokenForRole(AdminRole.EDITOR);
      // Seed an academy invitation; EDITOR must NOT see it counted.
      await prisma.academyInvitation.create({
        data: {
          email: 'z@test',
          tokenHash: 'pending-hash-3',
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(editorToken))
        .set('X-Site', 'ADMIN');

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.newInquiries).toBe(0);
      expect(body.draftArticles).toBe(0);
      expect(body.missingEnTotal).toBe(0);
      expect(body.pendingAcademyInvitations).toBeNull();
      expect(body.suspendedUsers).toBeNull();
      expect(body.auditFailuresSinceBoot).toBeNull();
    });
  });
});
