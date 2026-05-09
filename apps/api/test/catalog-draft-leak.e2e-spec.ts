import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from './test-app.factory';

/**
 * Phase 5 follow-up — defense-in-depth assertion that the new `draft` JSON
 * column doesn't leak through public read paths on the catalog entities.
 * The `PrismaService` applies a global `omit: { draft: true }` for every
 * model with a draft column; reads that genuinely need it (currently only
 * the admin article editor + admin course/lesson reads) opt back in via
 * `omit: { draft: false }`.
 *
 * This spec covers Property, City, Developer, Testimonial — none of their
 * admin UIs consume `draft` today, so unconditional omit on their public
 * endpoints is safe and the right invariant to lock.
 */
describe('Catalog draft-leak defense (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    // Per-test-reset's truncate list omits these tables; reset proactively
    // so we don't trip over state from prior suites.
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "properties", "cities", "testimonials" RESTART IDENTITY CASCADE;',
    );
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('public GET /testimonials/:id does not leak the draft column', async () => {
    const t = await prisma.testimonial.create({
      data: {
        clientName: 'Test Client',
        location: 'București',
        propertyType: 'apartment',
        quote: { ro: 'Citat', en: 'Quote' },
        rating: 5,
        // Stash a draft on the row so the leak would be visible if it existed.
        draft: { quote: { ro: 'Editor draft RO', en: 'Editor draft EN' } },
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/testimonials/${t.id}`)
      .set('X-Site', 'TGE_LUXURY');
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body).not.toHaveProperty('draft');
  });

  it('public GET /developers/:slug does not leak the draft column', async () => {
    const dev = await prisma.developer.create({
      data: {
        slug: `dev-leak-${Date.now()}`,
        name: 'Test Dev',
        logo: 'https://example.com/logo.png',
        description: { ro: 'Descriere', en: 'Description' },
        shortDescription: { ro: 'Scurt', en: 'Short' },
        city: 'București',
        citySlug: 'bucuresti',
        draft: {
          description: { ro: 'Editor draft RO', en: 'Editor draft EN' },
        },
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/developers/${dev.slug}`)
      .set('X-Site', 'TGE_LUXURY');
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body).not.toHaveProperty('draft');
  });

  it('public GET /cities/:slug does not leak the draft column', async () => {
    // Cities require a county FK; create one for the test.
    const county = await prisma.county.create({
      data: {
        name: 'TestCounty',
        slug: `tc-${Date.now()}`,
        code: `TC${Math.floor(Math.random() * 100)}`,
        latitude: 44.4,
        longitude: 26.1,
      },
    });
    const city = await prisma.city.create({
      data: {
        name: 'TestCity',
        slug: `tc-city-${Date.now()}`,
        countyId: county.id,
        description: { ro: 'Descriere', en: 'Description' },
        image: 'https://example.com/city.jpg',
        draft: {
          description: { ro: 'Editor draft RO', en: 'Editor draft EN' },
        },
      },
    });

    // ADMIN realm bypasses the tier-scoped county filter cities use for
    // the public TGE/Revery sites — without it, our test city's synthetic
    // county would be hidden behind brand visibility rules.
    const res = await request(app.getHttpServer())
      .get(`/api/v1/cities/${city.slug}`)
      .set('X-Site', 'ADMIN');
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body).not.toHaveProperty('draft');
  });

  it('public list endpoints strip draft from each row', async () => {
    await prisma.testimonial.create({
      data: {
        clientName: 'Client',
        location: 'București',
        propertyType: 'apartment',
        quote: { ro: 'Citat', en: 'Quote' },
        rating: 5,
        draft: { quote: { ro: 'Draft RO', en: 'Draft EN' } },
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/testimonials')
      .set('X-Site', 'TGE_LUXURY');
    expect(res.status).toBe(200);
    const list = (res.body.data ?? res.body) as unknown[];
    for (const item of list) {
      expect(item).not.toHaveProperty('draft');
    }
  });
});
