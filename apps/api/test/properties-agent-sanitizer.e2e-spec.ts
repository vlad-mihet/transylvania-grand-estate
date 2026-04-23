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
import { bearer, seedSuperAdminAndAccessToken } from './fixtures';

/**
 * Regression guard for the AGENT property-update sanitizer. The service
 * computes a `sanitizeForAgent(dto)` copy that drops fields the AGENT isn't
 * allowed to set (tier, featured, agentId, …) — this suite fails loudly if a
 * future refactor stops consuming the sanitized copy.
 */
describe('Properties — AGENT field sanitizer (e2e)', () => {
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
   * Seed an AGENT AdminUser linked to an Agent row, plus a Property owned by
   * that agent. Returns an access token for the AGENT and the other IDs the
   * test will assert against.
   */
  async function seedAgentWithProperty(): Promise<{
    agentToken: string;
    agentUserId: string;
    agentId: string;
    otherAgentId: string;
    propertyId: string;
  }> {
    const passwordHash = await bcrypt.hash('ignored', 4);
    const agentUser = await prisma.adminUser.create({
      data: {
        email: 'agent@test',
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
        email: 'agent@test.local',
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
        email: 'other@test.local',
        phone: '+40700000011',
        bio: { en: 'bio', ro: 'bio' },
        active: true,
      },
    });
    const property = await prisma.property.create({
      data: {
        slug: 'test-property',
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
        agentId: agent.id,
        features: [],
      },
    });

    const jwt = app.get(JwtService);
    const agentToken = jwt.sign(
      {
        sub: agentUser.id,
        email: agentUser.email,
        role: agentUser.role,
        agentId: agent.id,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      },
    );
    return {
      agentToken,
      agentUserId: agentUser.id,
      agentId: agent.id,
      otherAgentId: otherAgent.id,
      propertyId: property.id,
    };
  }

  it('AGENT PATCH with forbidden fields — allowed field updates, forbidden fields unchanged', async () => {
    const { agentToken, agentId, otherAgentId, propertyId } =
      await seedAgentWithProperty();

    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}`)
      .set(bearer(agentToken))
      .send({
        price: 500_000,          // allowed
        tier: PropertyTier.luxury, // forbidden
        featured: true,            // forbidden
        agentId: otherAgentId,     // forbidden
      })
      .expect(200);

    const row = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
    });
    expect(row.price).toBe(500_000);
    expect(row.tier).toBe(PropertyTier.affordable);
    expect(row.featured).toBe(false);
    expect(row.agentId).toBe(agentId);
  });

  it('AGENT PATCH with only allowed fields works end-to-end', async () => {
    const { agentToken, propertyId } = await seedAgentWithProperty();

    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}`)
      .set(bearer(agentToken))
      .send({ price: 300_000, bedrooms: 3 })
      .expect(200);

    const row = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
    });
    expect(row.price).toBe(300_000);
    expect(row.bedrooms).toBe(3);
  });

  // Sanity: SUPER_ADMIN still has unrestricted write authority.
  it('SUPER_ADMIN can set forbidden-to-AGENT fields', async () => {
    const { propertyId } = await seedAgentWithProperty();

    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}`)
      .set(bearer(admin.accessToken))
      .send({ tier: PropertyTier.luxury, featured: true })
      .expect(200);

    const row = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
    });
    expect(row.tier).toBe(PropertyTier.luxury);
    expect(row.featured).toBe(true);
  });
});
