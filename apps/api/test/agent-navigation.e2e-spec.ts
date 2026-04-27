import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import {
  AdminRole,
  PrismaClient,
  PropertyStatus,
  PropertyTier,
  PropertyType,
} from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './test-app.factory';
import { bearer, seedSuperAdminAndAccessToken, unwrap } from './fixtures';

/**
 * Regression guard for the AGENT role's navigation envelope (Phase-1 P0-001).
 * The admin AuthGuard's `AGENT_ALLOWED_PREFIXES` whitelist is a UI gate; the
 * load-bearing checks live on the API:
 *   - `OwnershipGuard` on PATCH/DELETE — must accept own, reject foreign.
 *   - `assertAgentOwns` on GET /properties/id/:id — must return 404 (not 403)
 *     for foreign rows so existence isn't leaked.
 *   - `applyAgentOwnershipScope` on GET /properties — must auto-scope the list.
 *   - `Roles` guard on DELETE — must reject AGENT regardless of ownership.
 * If any of these regress, the admin's belt-and-suspenders fix is suddenly
 * the only line of defense; this suite fails loudly when that happens.
 */
describe('Properties — AGENT navigation + ownership (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: { accessToken: string };

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    admin = await seedSuperAdminAndAccessToken(app, prisma);
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  /**
   * Two agents, one property each. Returns tokens + ids so each test can
   * pick the (own, foreign) pair it needs.
   */
  async function seedTwoAgentsWithProperties(): Promise<{
    agentToken: string;
    agentPropertyId: string;
    foreignPropertyId: string;
  }> {
    const passwordHash = await bcrypt.hash('ignored', 4);
    const agentUser = await prisma.adminUser.create({
      data: {
        email: 'agent-one@test',
        passwordHash,
        name: 'Agent One',
        role: AdminRole.AGENT,
      },
    });
    const agent = await prisma.agent.create({
      data: {
        slug: 'agent-one',
        firstName: 'Agent',
        lastName: 'One',
        email: 'agent-one@test.local',
        phone: '+40700000010',
        bio: { en: 'bio', ro: 'bio' },
        active: true,
        adminUserId: agentUser.id,
      },
    });
    const otherAgent = await prisma.agent.create({
      data: {
        slug: 'agent-two',
        firstName: 'Agent',
        lastName: 'Two',
        email: 'agent-two@test.local',
        phone: '+40700000011',
        bio: { en: 'bio', ro: 'bio' },
        active: true,
      },
    });

    const baseProperty = {
      title: { en: 'T', ro: 'T' },
      description: { en: 'D', ro: 'D' },
      shortDescription: { en: 'S', ro: 'S' },
      price: 250_000,
      currency: 'EUR',
      type: PropertyType.apartment,
      status: PropertyStatus.available,
      tier: PropertyTier.affordable,
      city: 'Bucharest',
      citySlug: 'bucharest',
      neighborhood: 'Primaverii',
      address: { en: 'Str.', ro: 'Str.' },
      latitude: 44.4,
      longitude: 26.1,
      bedrooms: 2,
      bathrooms: 1,
      area: 80,
      floors: 1,
      yearBuilt: 2015,
      featured: false,
      isNew: false,
      features: [],
    };

    const ownProperty = await prisma.property.create({
      data: { ...baseProperty, slug: 'agent-one-property', agentId: agent.id },
    });
    const foreignProperty = await prisma.property.create({
      data: {
        ...baseProperty,
        slug: 'agent-two-property',
        agentId: otherAgent.id,
      },
    });

    const agentToken = app.get(JwtService).sign(
      {
        sub: agentUser.id,
        email: agentUser.email,
        role: agentUser.role,
        agentId: agent.id,
      },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );

    return {
      agentToken,
      agentPropertyId: ownProperty.id,
      foreignPropertyId: foreignProperty.id,
    };
  }

  it('GET /properties/id/:id — AGENT can read own property', async () => {
    const { agentToken, agentPropertyId } = await seedTwoAgentsWithProperties();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/properties/id/${agentPropertyId}`)
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .expect(200);

    expect(unwrap<{ id: string }>(res).id).toBe(agentPropertyId);
  });

  it('GET /properties/id/:id — AGENT gets 404 (not 403) on foreign property — no existence leak', async () => {
    const { agentToken, foreignPropertyId } =
      await seedTwoAgentsWithProperties();

    await request(app.getHttpServer())
      .get(`/api/v1/properties/id/${foreignPropertyId}`)
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .expect(404);
  });

  it('PATCH /properties/:id — AGENT can update own property', async () => {
    const { agentToken, agentPropertyId } = await seedTwoAgentsWithProperties();

    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${agentPropertyId}`)
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .send({ price: 275_000 })
      .expect(200);

    const row = await prisma.property.findUniqueOrThrow({
      where: { id: agentPropertyId },
    });
    expect(row.price).toBe(275_000);
  });

  it('PATCH /properties/:id — AGENT is rejected with 403 on foreign property', async () => {
    const { agentToken, foreignPropertyId } =
      await seedTwoAgentsWithProperties();

    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${foreignPropertyId}`)
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .send({ price: 999_999 })
      .expect(403);

    // Sanity: the foreign property's price is unchanged.
    const row = await prisma.property.findUniqueOrThrow({
      where: { id: foreignPropertyId },
    });
    expect(row.price).toBe(250_000);
  });

  it('DELETE /properties/:id — AGENT is rejected with 403 even on own property (role guard)', async () => {
    const { agentToken, agentPropertyId } = await seedTwoAgentsWithProperties();

    await request(app.getHttpServer())
      .delete(`/api/v1/properties/${agentPropertyId}`)
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .expect(403);

    // Sanity: the row still exists.
    const row = await prisma.property.findUnique({
      where: { id: agentPropertyId },
    });
    expect(row).not.toBeNull();
  });

  it('GET /properties — AGENT list is auto-scoped to own rows', async () => {
    const { agentToken, agentPropertyId } = await seedTwoAgentsWithProperties();

    const res = await request(app.getHttpServer())
      .get('/api/v1/properties?limit=50')
      .set(bearer(agentToken))
      .set('X-Site', 'ADMIN')
      .expect(200);

    const ids = (res.body.data as Array<{ id: string }>).map((p) => p.id);
    expect(ids).toEqual([agentPropertyId]);
    expect(res.body.meta?.total).toBe(1);
  });

  it('SUPER_ADMIN sees both rows on the same list (control)', async () => {
    await seedTwoAgentsWithProperties();

    const res = await request(app.getHttpServer())
      .get('/api/v1/properties?limit=50')
      .set(bearer(admin.accessToken))
      .set('X-Site', 'ADMIN')
      .expect(200);

    expect(res.body.meta?.total).toBe(2);
  });
});
