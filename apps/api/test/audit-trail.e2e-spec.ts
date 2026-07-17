import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient, PropertyStatus } from '@prisma/client';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Regression net for the audit interceptor + the users-list pagination
 * contract — both surfaced by the 2026-07 full sweep.
 *
 * BUG-117: `AuditInterceptor.classify()` split `req.url` and dispatched on the
 * first segment, but `setGlobalPrefix('api/v1')` means every URL begins
 * `/api/v1/...` — so `head` was always 'api', nothing matched, and NO resource
 * mutation was ever audited (only the auth service's own recordCustom rows).
 * These tests assert a real POST/PATCH/DELETE writes an audit_logs row.
 *
 * BUG-118: the admin People hub requests `/auth/users?limit=N`, but
 * `listUsersSchema` was `.strict()` with no pagination → 400, rendered as an
 * empty user list. The endpoint now paginates like /agents when asked.
 */
describe('Audit trail + users pagination (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    ({ accessToken: token } = await seedSuperAdminAndAccessToken(app, prisma));
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // The interceptor writes the audit row fire-and-forget in a tap() after the
  // response is sent, so it can land a beat after supertest resolves. Poll
  // briefly instead of asserting synchronously.
  async function waitForAuditRows(
    where: { resource: string; resourceId: string; action?: string },
    attempts = 20,
  ): Promise<Array<{ action: string }>> {
    for (let i = 0; i < attempts; i++) {
      const rows = await prisma.auditLog.findMany({ where });
      if (rows.length > 0) return rows;
      await new Promise((r) => setTimeout(r, 50));
    }
    return prisma.auditLog.findMany({ where });
  }

  async function createProperty(slug: string): Promise<string> {
    const p = await prisma.property.create({
      data: {
        slug,
        title: { ro: 'Test', en: 'Test' },
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
    });
    return p.id;
  }

  describe('BUG-117 — resource mutations are audited', () => {
    it('writes an audit_logs row on a property PATCH', async () => {
      const id = await createProperty('audit-patch-probe');

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/properties/${id}`)
        .set('X-Site', 'ADMIN')
        .set(bearer(token))
        .send({ price: 123456 });
      expect(res.status).toBe(200);

      const rows = await waitForAuditRows({
        resource: 'Property',
        resourceId: id,
      });
      expect(rows.length).toBe(1);
      expect(rows[0].action).toBe('property.update');
    });

    it('writes an audit_logs row on a property DELETE', async () => {
      const id = await createProperty('audit-delete-probe');

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/properties/${id}`)
        .set('X-Site', 'ADMIN')
        .set(bearer(token));
      expect([200, 204]).toContain(res.status);

      const rows = await waitForAuditRows({
        resource: 'Property',
        resourceId: id,
        action: 'property.delete',
      });
      expect(rows.length).toBe(1);
    });
  });

  describe('BUG-118 — /auth/users paginates when asked', () => {
    it('returns { data, meta.total } for a limited request', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/users?limit=500')
        .set('X-Site', 'ADMIN')
        .set(bearer(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.meta?.total).toBe('number');
      // At least the seeded super-admin.
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('still returns a bare array when no pagination is requested', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/users')
        .set('X-Site', 'ADMIN')
        .set(bearer(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
