import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AdminRole, PrismaClient, PropertyStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Phase 3 — Catalog module home aggregator. Single round-trip endpoint
 * powering /catalog: counts + 5-row recents per type (properties,
 * developers, testimonials). Role-gated EDITOR+ at the controller; no
 * per-field role gating (every field is unconditionally present).
 */
describe('GET /admin/catalog/overview (e2e)', () => {
  const ENDPOINT = '/api/v1/admin/catalog/overview';

  let app: INestApplication;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    // Per-test-reset omits properties / developers / testimonials in some
    // suites; truncate proactively so seeded counts are deterministic.
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "properties", "developers", "testimonials" RESTART IDENTITY CASCADE;',
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

    it('lets EDITOR through with 200', async () => {
      const editorToken = await seedTokenForRole(AdminRole.EDITOR);
      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(editorToken))
        .set('X-Site', 'ADMIN');
      expect(res.status).toBe(200);
    });
  });

  describe('aggregation', () => {
    it('returns zero counts and null avgRating on an empty DB', async () => {
      const admin = await seedSuperAdminAndAccessToken(app, prisma);
      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN');

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.properties.total).toBe(0);
      expect(body.properties.available).toBe(0);
      expect(body.properties.featured).toBe(0);
      expect(body.properties.recent).toEqual([]);
      expect(body.developers.total).toBe(0);
      expect(body.developers.featured).toBe(0);
      expect(body.developers.recent).toEqual([]);
      expect(body.testimonials.total).toBe(0);
      expect(body.testimonials.avgRating).toBeNull();
      expect(body.testimonials.recent).toEqual([]);
    });

    it('returns seeded counts + recent[] limited to 5 + rounded avgRating', async () => {
      const admin = await seedSuperAdminAndAccessToken(app, prisma);

      // 3 properties: 2 available (1 featured), 1 sold
      await prisma.property.createMany({
        data: [
          {
            slug: 'p-avail-feat',
            title: { ro: 'Disponibilă', en: 'Available' },
            description: {},
            shortDescription: {},
            address: {},
            price: 100000,
            type: 'apartment',
            status: PropertyStatus.available,
            featured: true,
            city: 'Cluj',
            citySlug: 'cluj',
            neighborhood: '',
            latitude: 0,
            longitude: 0,
            bedrooms: 2,
            bathrooms: 1,
            area: 50,
            floors: 4,
            yearBuilt: 2020,
          },
          {
            slug: 'p-avail-plain',
            title: { ro: 'Standard', en: 'Standard' },
            description: {},
            shortDescription: {},
            address: {},
            price: 100000,
            type: 'apartment',
            status: PropertyStatus.available,
            city: 'Cluj',
            citySlug: 'cluj',
            neighborhood: '',
            latitude: 0,
            longitude: 0,
            bedrooms: 2,
            bathrooms: 1,
            area: 50,
            floors: 4,
            yearBuilt: 2020,
          },
          {
            slug: 'p-sold',
            title: { ro: 'Vândută', en: 'Sold' },
            description: {},
            shortDescription: {},
            address: {},
            price: 100000,
            type: 'apartment',
            status: PropertyStatus.sold,
            city: 'Cluj',
            citySlug: 'cluj',
            neighborhood: '',
            latitude: 0,
            longitude: 0,
            bedrooms: 2,
            bathrooms: 1,
            area: 50,
            floors: 4,
            yearBuilt: 2020,
          },
        ],
      });

      // 2 developers, 1 featured
      await prisma.developer.createMany({
        data: [
          {
            slug: 'dev-feat',
            name: 'Dev Alpha',
            logo: 'https://example.com/a.png',
            description: {},
            shortDescription: {},
            city: 'Cluj',
            citySlug: 'cluj',
            featured: true,
            projectCount: 3,
          },
          {
            slug: 'dev-plain',
            name: 'Dev Beta',
            logo: 'https://example.com/b.png',
            description: {},
            shortDescription: {},
            city: 'Cluj',
            citySlug: 'cluj',
            projectCount: 1,
          },
        ],
      });

      // 7 testimonials (more than RECENT_LIMIT=5) with mixed ratings.
      // Avg = (5+4+3+5+4+3+5)/7 = 29/7 ≈ 4.142857... → rounded to 4.1
      await prisma.testimonial.createMany({
        data: [
          { clientName: 'A', location: 'Cluj', propertyType: 'apartment', quote: {}, rating: 5 },
          { clientName: 'B', location: 'Cluj', propertyType: 'apartment', quote: {}, rating: 4 },
          { clientName: 'C', location: 'Cluj', propertyType: 'apartment', quote: {}, rating: 3 },
          { clientName: 'D', location: 'Cluj', propertyType: 'apartment', quote: {}, rating: 5 },
          { clientName: 'E', location: 'Cluj', propertyType: 'apartment', quote: {}, rating: 4 },
          { clientName: 'F', location: 'Cluj', propertyType: 'apartment', quote: {}, rating: 3 },
          { clientName: 'G', location: 'Cluj', propertyType: 'apartment', quote: {}, rating: 5 },
        ],
      });

      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(bearer(admin.accessToken))
        .set('X-Site', 'ADMIN');

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;

      // Properties counts
      expect(body.properties.total).toBe(3);
      expect(body.properties.available).toBe(2);
      expect(body.properties.sold).toBe(1);
      expect(body.properties.reserved).toBe(0);
      expect(body.properties.featured).toBe(1);
      expect(body.properties.recent).toHaveLength(3);
      // Recent rows carry the structured fields
      const firstRecentProperty = body.properties.recent[0];
      expect(firstRecentProperty).toHaveProperty('id');
      expect(firstRecentProperty).toHaveProperty('slug');
      expect(firstRecentProperty).toHaveProperty('title');
      expect(firstRecentProperty).toHaveProperty('status');
      expect(firstRecentProperty).toHaveProperty('featured');
      expect(firstRecentProperty).toHaveProperty('updatedAt');

      // Developers counts
      expect(body.developers.total).toBe(2);
      expect(body.developers.featured).toBe(1);
      expect(body.developers.recent).toHaveLength(2);

      // Testimonials counts + avg rounded to 1 decimal + recent capped at 5
      expect(body.testimonials.total).toBe(7);
      expect(body.testimonials.avgRating).toBe(4.1);
      expect(body.testimonials.recent).toHaveLength(5);
    });
  });
});
