import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AdminRole, PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Phase 4 — locale completeness aggregate endpoint. Powers the admin
 * /content hub's LocaleCompletenessPanel + EnTranslationsQueue. The endpoint
 * is read-only, gated to EDITOR+, and must not leak draft snapshots (it
 * counts only the live localized columns).
 */
describe('GET /admin/content/locale-completeness (e2e)', () => {
  const ENDPOINT = '/api/v1/admin/content/locale-completeness';

  let app: INestApplication;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    // The shared per-test-reset truncate list omits articles, cities, and
    // testimonials, so prior suites can leave state behind that would skew
    // these aggregate counts. Reset proactively here so the empty-DB and
    // mixed-fill cases see exactly what they seed.
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "articles", "cities", "testimonials" RESTART IDENTITY CASCADE;',
    );
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('auth & role gating', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set('X-Site', 'ADMIN');
      expect(res.status).toBe(401);
    });

    it('rejects AGENT role with 403', async () => {
      const passwordHash = await bcrypt.hash('ignored', 4);
      const agentUser = await prisma.adminUser.create({
        data: {
          email: 'agent@test',
          passwordHash,
          name: 'Agent',
          role: AdminRole.AGENT,
        },
      });
      const jwt = app.get(JwtService);
      const agentToken = jwt.sign(
        {
          sub: agentUser.id,
          email: agentUser.email,
          role: agentUser.role,
          agentId: null,
        },
        { secret: process.env.JWT_ADMIN_ACCESS_SECRET, expiresIn: '15m' },
      );

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

  describe('aggregation', () => {
    it('returns zero counts and empty queue on an empty DB', async () => {
      const admin = await seedSuperAdminAndAccessToken(app, prisma);
      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN');

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      // Every entity type starts at zero.
      for (const type of [
        'article',
        'course',
        'lesson',
        'property',
        'city',
        'developer',
        'agent',
        'testimonial',
      ] as const) {
        expect(body.byType[type].total).toBe(0);
        for (const locale of ['ro', 'en', 'fr', 'de'] as const) {
          expect(body.byType[type].filledByLocale[locale]).toBe(0);
        }
      }
      expect(body.missingEn).toEqual([]);
      expect(body.missingEnTotal).toBe(0);
    });

    it('counts mixed-locale fills and surfaces missing-EN entries in the queue', async () => {
      const admin = await seedSuperAdminAndAccessToken(app, prisma);

      // Fully filled article (RO + EN).
      await prisma.article.create({
        data: {
          slug: 'full-article',
          title: { ro: 'Plin', en: 'Full' },
          excerpt: { ro: 'Rezumat', en: 'Excerpt' },
          content: { ro: 'Conținut', en: 'Content' },
          coverImage: 'https://example.com/cover.jpg',
          category: 'guide',
          authorName: 'Author',
        },
      });
      // RO-only article — should appear in missingEn.
      const partialArticle = await prisma.article.create({
        data: {
          slug: 'partial-article',
          title: { ro: 'Doar RO', en: '' },
          excerpt: { ro: 'Rezumat', en: '' },
          content: { ro: 'Conținut', en: '' },
          coverImage: 'https://example.com/cover2.jpg',
          category: 'news',
          authorName: 'Author',
        },
      });
      // Testimonial with three locales filled (FR included).
      await prisma.testimonial.create({
        data: {
          clientName: 'Client',
          location: 'București',
          propertyType: 'apartment',
          quote: { ro: 'Citat', en: 'Quote', fr: 'Citation' },
          rating: 5,
        },
      });

      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN');

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;

      // Article counts: 2 total, 2 filled in RO, 1 in EN, 0 in FR/DE.
      expect(body.byType.article.total).toBe(2);
      expect(body.byType.article.filledByLocale.ro).toBe(2);
      expect(body.byType.article.filledByLocale.en).toBe(1);
      expect(body.byType.article.filledByLocale.fr).toBe(0);
      expect(body.byType.article.filledByLocale.de).toBe(0);

      // Testimonial counts: 1 with RO/EN/FR filled, 0 in DE.
      expect(body.byType.testimonial.total).toBe(1);
      expect(body.byType.testimonial.filledByLocale.ro).toBe(1);
      expect(body.byType.testimonial.filledByLocale.en).toBe(1);
      expect(body.byType.testimonial.filledByLocale.fr).toBe(1);
      expect(body.byType.testimonial.filledByLocale.de).toBe(0);

      // Queue includes the RO-only article and excludes the fully filled one.
      const queueIds = body.missingEn.map(
        (entry: { id: string; type: string }) => entry.id,
      );
      expect(queueIds).toContain(partialArticle.id);
      // Queue rows deep-link into the editor with locale=en.
      const partialEntry = body.missingEn.find(
        (e: { id: string }) => e.id === partialArticle.id,
      );
      expect(partialEntry.editHref).toContain('?loc=en');
      expect(partialEntry.type).toBe('article');
      expect(body.missingEnTotal).toBeGreaterThanOrEqual(1);
    });
  });
});
