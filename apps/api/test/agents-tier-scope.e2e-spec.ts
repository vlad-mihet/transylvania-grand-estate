import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import {
  PrismaClient,
  PropertyStatus,
  PropertyTier,
  PropertyType,
} from '@prisma/client';
import { createTestApp } from './test-app.factory';

/**
 * Brand-isolation guard for the nested `properties` relation exposed on
 * agent read endpoints. Before the tierScopeFilter rollout, the
 * relation returned every tier regardless of the caller's site — this
 * suite fails loudly if any future include on Agent stops going through
 * `scopedPropertiesInclude`.
 */
describe('Agents — tier scope on nested properties (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  /**
   * Seed an agent with one luxury + one affordable property so each test
   * only needs to assert on the filtered subset per X-Site header. Properties
   * are placed in Cluj-Napoca so they fall within the TGE brand's geo scope
   * (historical Transylvania); this isolates the tier-scope assertions from
   * the geo-scope filter without mocking SiteConfigService.
   */
  async function seedMixedTierAgent(): Promise<{
    slug: string;
    agentId: string;
    luxuryId: string;
    affordableId: string;
  }> {
    const county = await prisma.county.upsert({
      where: { slug: 'cluj' },
      update: {},
      create: {
        name: 'Cluj',
        slug: 'cluj',
        code: 'CJ',
        latitude: 46.77,
        longitude: 23.6,
      },
    });
    const city = await prisma.city.upsert({
      where: { slug: 'cluj-napoca' },
      update: {},
      create: {
        name: 'Cluj-Napoca',
        slug: 'cluj-napoca',
        description: { en: 'c', ro: 'c' },
        image: '/uploads/placeholder-city.png',
        countyId: county.id,
      },
    });
    const agent = await prisma.agent.create({
      data: {
        slug: 'dual-tier',
        firstName: 'Dual',
        lastName: 'Tier',
        email: 'dual@test',
        bio: { en: 'bio', ro: 'bio' },
        active: true,
      },
    });
    const base = {
      title: { en: 'T', ro: 'T' },
      description: { en: 'D', ro: 'D' },
      shortDescription: { en: 'S', ro: 'S' },
      currency: 'EUR',
      type: PropertyType.apartment,
      status: PropertyStatus.available,
      city: 'Cluj-Napoca',
      citySlug: 'cluj-napoca',
      cityId: city.id,
      neighborhood: 'Centru',
      address: { en: 'Str.', ro: 'Str.' },
      latitude: 46.77,
      longitude: 23.6,
      bedrooms: 2,
      bathrooms: 1,
      area: 80,
      floors: 1,
      yearBuilt: 2015,
      featured: false,
      isNew: false,
      agentId: agent.id,
      features: [],
    } as const;
    const luxury = await prisma.property.create({
      data: { ...base, slug: 'lux-1', price: 2_000_000, tier: PropertyTier.luxury },
    });
    const affordable = await prisma.property.create({
      data: { ...base, slug: 'afd-1', price: 250_000, tier: PropertyTier.affordable },
    });
    return {
      slug: agent.slug,
      agentId: agent.id,
      luxuryId: luxury.id,
      affordableId: affordable.id,
    };
  }

  it('REVERIA site: GET /agents/:slug returns only affordable properties', async () => {
    const { slug, affordableId, luxuryId } = await seedMixedTierAgent();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/agents/${slug}`)
      .set('X-Site', 'REVERIA')
      .expect(200);

    const ids = res.body.data.properties.map((p: { id: string }) => p.id);
    expect(ids).toContain(affordableId);
    expect(ids).not.toContain(luxuryId);
  });

  it('TGE_LUXURY site: GET /agents/:slug returns only luxury properties', async () => {
    const { slug, affordableId, luxuryId } = await seedMixedTierAgent();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/agents/${slug}`)
      .set('X-Site', 'TGE_LUXURY')
      .expect(200);

    const ids = res.body.data.properties.map((p: { id: string }) => p.id);
    expect(ids).toContain(luxuryId);
    expect(ids).not.toContain(affordableId);
  });

  it('ADMIN site: GET /agents/id/:id returns both tiers', async () => {
    const { agentId, affordableId, luxuryId } = await seedMixedTierAgent();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/agents/id/${agentId}`)
      .set('X-Site', 'ADMIN')
      .expect(200);

    const ids = res.body.data.properties.map((p: { id: string }) => p.id);
    expect(ids).toContain(luxuryId);
    expect(ids).toContain(affordableId);
  });

  it('REVERIA site: GET /agents (list) filters embedded properties', async () => {
    const { affordableId, luxuryId } = await seedMixedTierAgent();

    const res = await request(app.getHttpServer())
      .get('/api/v1/agents?page=1&limit=10')
      .set('X-Site', 'REVERIA')
      .expect(200);

    const rows = res.body.data.data as Array<{
      properties: { id: string }[];
    }>;
    const allIds = rows.flatMap((r) => r.properties.map((p) => p.id));
    expect(allIds).toContain(affordableId);
    expect(allIds).not.toContain(luxuryId);
  });
});
