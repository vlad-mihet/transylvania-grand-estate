import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Phase 5 — articles are the canonical exemplar for the draft/publish split.
 * All eight services (Article, Course, Lesson, Property, City, Developer,
 * Agent, Testimonial) share `applyDraftMode` (covered by its unit test); a
 * single end-to-end pass through articles proves the wiring connects DTO ↔
 * service ↔ Prisma. Don't duplicate this across the other seven entities —
 * that's maintenance debt without information gain.
 */
describe('PATCH /articles/:id — draft/publish flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: { accessToken: string };

  // Per-test-reset.ts doesn't include the `articles` table, so slugs collide
  // across tests. Each test gets a unique slug bound at beforeEach so it
  // owns its own row regardless of prior suite state.
  let currentSlug: string;
  const buildPayload = () => ({
    slug: currentSlug,
    title: { ro: 'Original RO', en: 'Original EN' },
    excerpt: { ro: 'Original RO excerpt', en: 'Original EN excerpt' },
    content: { ro: 'Original RO content', en: 'Original EN content' },
    coverImage: 'https://example.com/cover.jpg',
    category: 'guide',
    authorName: 'Author',
  });

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    admin = await seedSuperAdminAndAccessToken(app, prisma);
    currentSlug = `draft-spec-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function createArticle(): Promise<{ id: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .send(buildPayload());
    expect(res.status).toBe(201);
    return { id: res.body.data.id };
  }

  it('mode="draft" snapshots localized fields and leaves live untouched', async () => {
    const { id } = await createArticle();

    const draftRes = await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .send({
        mode: 'draft',
        title: { ro: 'Drafted RO', en: 'Drafted EN' },
      });
    expect(draftRes.status).toBe(200);

    const row = await prisma.article.findUniqueOrThrow({ where: { id } });
    expect(row.title).toEqual({ ro: 'Original RO', en: 'Original EN' });
    expect(row.draft).toEqual({
      title: { ro: 'Drafted RO', en: 'Drafted EN' },
    });
  });

  it('mode="publish" promotes localized fields to live and clears the draft', async () => {
    const { id } = await createArticle();

    // Stash a draft first.
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .send({
        mode: 'draft',
        title: { ro: 'Drafted RO', en: 'Drafted EN' },
      });

    // Now publish a different value.
    const publishRes = await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .send({
        mode: 'publish',
        title: { ro: 'Published RO', en: 'Published EN' },
      });
    expect(publishRes.status).toBe(200);

    const row = await prisma.article.findUniqueOrThrow({ where: { id } });
    expect(row.title).toEqual({ ro: 'Published RO', en: 'Published EN' });
    expect(row.draft).toBeNull();
  });

  it('omitted mode behaves like publish (back-compat for legacy callers)', async () => {
    const { id } = await createArticle();

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .send({
        title: { ro: 'Newer RO', en: 'Newer EN' },
      });
    expect(res.status).toBe(200);

    const row = await prisma.article.findUniqueOrThrow({ where: { id } });
    expect(row.title).toEqual({ ro: 'Newer RO', en: 'Newer EN' });
    expect(row.draft).toBeNull();
  });

  it('a metadata-only PATCH does not touch the draft column', async () => {
    const { id } = await createArticle();

    // Seed a draft so we can confirm it survives a non-localized update.
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .send({
        mode: 'draft',
        title: { ro: 'Drafted RO', en: 'Drafted EN' },
      });

    // PATCH only a non-localized field with mode "draft" — no localized
    // fields in the dto, so no snapshot, but also no draft clear.
    const newSlug = `${currentSlug}-renamed`;
    const slugRes = await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .send({ slug: newSlug, mode: 'draft' });
    expect(slugRes.status).toBe(200);

    const row = await prisma.article.findUniqueOrThrow({ where: { id } });
    expect(row.slug).toBe(newSlug);
    // Draft from the previous PATCH still intact.
    expect(row.draft).toEqual({
      title: { ro: 'Drafted RO', en: 'Drafted EN' },
    });
  });

  it('public read endpoint serves live values, never drafts', async () => {
    const { id } = await createArticle();

    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${id}`)
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .send({
        mode: 'draft',
        title: { ro: 'Hidden draft RO', en: 'Hidden draft EN' },
      });

    const publicRes = await request(app.getHttpServer())
      .get(`/api/v1/articles/${currentSlug}`)
      .set('X-Site', 'TGE_LUXURY');
    expect(publicRes.status).toBe(200);

    const article = publicRes.body.data ?? publicRes.body;
    // The contract that matters for readers: live `title` is what's served,
    // never the draft snapshot. Public consumers (revery, landing) read
    // `article.title` — and because the endpoint is `@LocaleScope('public')`,
    // the LocalizedSerializerInterceptor collapses it to the request locale
    // (default RO). The value must be the published one ('Original RO'),
    // never the draft ('Hidden draft RO'). Editors needing the full blob pass
    // `?expand=allLocales`.
    expect(article.title).toBe('Original RO');
    // Defense in depth: PrismaService omits `draft` by default, so the
    // public read path never includes it in the response. A regression
    // here would re-leak unpublished editor work.
    expect(article).not.toHaveProperty('draft');
  });

  it('admin /admin/articles/by-slug/:slug surfaces draft for the editor', async () => {
    await createArticle();

    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${(await prisma.article.findFirstOrThrow({ where: { slug: currentSlug } })).id}`)
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .send({
        mode: 'draft',
        title: { ro: 'Editor draft RO', en: 'Editor draft EN' },
      });

    const adminRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/articles/by-slug/${currentSlug}`)
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN');
    expect(adminRes.status).toBe(200);

    const article = adminRes.body.data ?? adminRes.body;
    // Live `title` is unchanged because draft mode doesn't promote.
    expect(article.title).toEqual({
      ro: 'Original RO',
      en: 'Original EN',
    });
    // The admin endpoint opts back into `draft` so the editor can
    // pre-populate the form and show a "Draft pending" chip.
    expect(article.draft).toEqual({
      title: { ro: 'Editor draft RO', en: 'Editor draft EN' },
    });
  });

  it('admin endpoint rejects unauthenticated callers', async () => {
    await createArticle();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/articles/by-slug/${currentSlug}`)
      .set('X-Site', 'ADMIN');
    expect(res.status).toBe(401);
  });
});
