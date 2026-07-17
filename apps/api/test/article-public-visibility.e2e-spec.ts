import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { ArticleStatus, PrismaClient } from '@prisma/client';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Regression for BUG-109 (2026-07 sweep): the public articles API leaked
 * drafts on BOTH the list and the by-slug endpoints. `findAll` only filtered
 * status when a `?status=` param was passed and `findBySlug` had no status
 * filter at all — so an unauthenticated caller could read unpublished
 * editorial content. Public callers must now always be scoped to published;
 * editors still see everything.
 */
describe('Articles public visibility (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: { accessToken: string };

  const draftSlug = `pub-vis-draft-${Date.now()}`;
  const publishedSlug = `pub-vis-published-${Date.now()}`;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    admin = await seedSuperAdminAndAccessToken(app, prisma);

    await prisma.article.deleteMany({
      where: { slug: { in: [draftSlug, publishedSlug] } },
    });
    await prisma.article.create({
      data: {
        slug: draftSlug,
        title: { ro: 'Draft', en: 'Draft' },
        excerpt: {},
        content: {},
        coverImage: 'https://example.com/cover.jpg',
        category: 'news',
        authorName: 'QA',
        status: ArticleStatus.draft,
      },
    });
    await prisma.article.create({
      data: {
        slug: publishedSlug,
        title: { ro: 'Publicat', en: 'Published' },
        excerpt: {},
        content: {},
        coverImage: 'https://example.com/cover.jpg',
        category: 'news',
        authorName: 'QA',
        status: ArticleStatus.published,
        publishedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('public / unauthenticated callers', () => {
    it('GET /articles/:slug returns 404 for a draft', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/articles/${draftSlug}`)
        .set('X-Site', 'TGE_LUXURY');
      expect(res.status).toBe(404);
    });

    it('GET /articles/:slug serves a published article', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/articles/${publishedSlug}`)
        .set('X-Site', 'TGE_LUXURY');
      expect(res.status).toBe(200);
    });

    it('list excludes drafts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/articles?limit=100')
        .set('X-Site', 'TGE_LUXURY');
      expect(res.status).toBe(200);
      const slugs = res.body.data.map((a: { slug: string }) => a.slug);
      expect(slugs).toContain(publishedSlug);
      expect(slugs).not.toContain(draftSlug);
    });

    it('?status=draft cannot widen the public scope to drafts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/articles?limit=100&status=draft')
        .set('X-Site', 'TGE_LUXURY');
      expect(res.status).toBe(200);
      const slugs = res.body.data.map((a: { slug: string }) => a.slug);
      expect(slugs).not.toContain(draftSlug);
    });
  });

  describe('editor callers', () => {
    it('GET /articles/:slug resolves a draft for an authenticated editor', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/articles/${draftSlug}`)
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN');
      expect(res.status).toBe(200);
    });

    it('list without a status filter includes drafts for an editor', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/articles?limit=100')
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN');
      expect(res.status).toBe(200);
      const slugs = res.body.data.map((a: { slug: string }) => a.slug);
      expect(slugs).toContain(draftSlug);
    });
  });
});
