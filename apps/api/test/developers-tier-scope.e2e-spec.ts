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
 * developer read endpoints. Mirrors the agent suite — any future include on
 * Developer that forgets `scopedPropertiesInclude` fails here.
 */
describe('Developers — tier scope on nested properties (e2e)', () => {
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

  async function seedMixedTierDeveloper(): Promise<{
    slug: string;
    developerId: string;
    luxuryId: string;
    affordableId: string;
  }> {
    // Place the developer + properties in Cluj-Napoca (historical
    // Transylvania) so the TGE brand's geo scope keeps the luxury row in
    // view — tier-scope assertions stay isolated from geo-scope filtering.
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
    const developer = await prisma.developer.create({
      data: {
        slug: 'dual-tier-dev',
        name: 'Dual Tier Developer',
        logo: '/uploads/placeholder-logo.png',
        description: { en: 'd', ro: 'd' },
        shortDescription: { en: 's', ro: 's' },
        city: 'Cluj-Napoca',
        citySlug: 'cluj-napoca',
        projectCount: 2,
        featured: false,
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
      developerId: developer.id,
      features: [],
    } as const;
    const luxury = await prisma.property.create({
      data: { ...base, slug: 'dev-lux-1', price: 2_000_000, tier: PropertyTier.luxury },
    });
    const affordable = await prisma.property.create({
      data: { ...base, slug: 'dev-afd-1', price: 250_000, tier: PropertyTier.affordable },
    });
    return {
      slug: developer.slug,
      developerId: developer.id,
      luxuryId: luxury.id,
      affordableId: affordable.id,
    };
  }

  it('REVERIA site: GET /developers/:slug returns only affordable properties', async () => {
    const { slug, affordableId, luxuryId } = await seedMixedTierDeveloper();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/developers/${slug}`)
      .set('X-Site', 'REVERIA')
      .expect(200);

    const ids = res.body.data.properties.map((p: { id: string }) => p.id);
    expect(ids).toContain(affordableId);
    expect(ids).not.toContain(luxuryId);
  });

  it('TGE_LUXURY site: GET /developers/:slug returns only luxury properties', async () => {
    const { slug, affordableId, luxuryId } = await seedMixedTierDeveloper();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/developers/${slug}`)
      .set('X-Site', 'TGE_LUXURY')
      .expect(200);

    const ids = res.body.data.properties.map((p: { id: string }) => p.id);
    expect(ids).toContain(luxuryId);
    expect(ids).not.toContain(affordableId);
  });

  it('ADMIN site: GET /developers/id/:id returns both tiers', async () => {
    const { developerId, affordableId, luxuryId } = await seedMixedTierDeveloper();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/developers/id/${developerId}`)
      .set('X-Site', 'ADMIN')
      .expect(200);

    const ids = res.body.data.properties.map((p: { id: string }) => p.id);
    expect(ids).toContain(luxuryId);
    expect(ids).toContain(affordableId);
  });
});
