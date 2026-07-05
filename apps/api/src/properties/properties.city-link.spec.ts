import { Brand, PropertyTier } from '@prisma/client';
import { PropertiesService } from './properties.service';

/**
 * Regression guard for the showstopper found in verification: admin-created
 * listings were saved with a NULL `city_id` and so never appeared on the
 * public sites (which gate visibility through the City FK → brand membership).
 * `create()` must now resolve `citySlug → cityId` AND tag the city for the
 * listing's brand (add-only), so the listing is actually visible.
 */
describe('PropertiesService — city linking on create', () => {
  function makeService(cityFound = true) {
    const prisma: any = {
      property: {
        findUnique: jest.fn().mockResolvedValue(null), // slug is unique
        create: jest
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve({ id: 'p1', ...data }),
          ),
      },
      city: {
        findUnique: jest
          .fn()
          .mockResolvedValue(cityFound ? { id: 'city-1' } : null),
      },
      cityBrand: { upsert: jest.fn().mockResolvedValue({}) },
      developer: { findUnique: jest.fn() },
      agent: { findUnique: jest.fn() },
    };
    const svc = new PropertiesService(prisma, {} as any, {} as any);
    return { svc, prisma };
  }

  const dto = (over: Record<string, unknown> = {}) =>
    ({
      slug: 'sibiu-apartament-1',
      title: { ro: 'Ap', en: 'Ap' },
      description: { ro: 'D', en: 'D' },
      shortDescription: { ro: 'S', en: 'S' },
      price: 250000,
      type: 'apartment',
      city: 'Sibiu',
      citySlug: 'sibiu',
      neighborhood: 'Centru',
      address: { ro: 'Str', en: 'St' },
      coordinates: { lat: 45.79, lng: 24.12 },
      bedrooms: 2,
      bathrooms: 1,
      area: 75,
      floors: 1,
      yearBuilt: 2015,
      ...over,
    }) as never;

  it('links cityId and tags the city for the brand (affordable → revery)', async () => {
    const { svc, prisma } = makeService();
    await svc.create(dto({ tier: 'affordable' }));

    expect(prisma.city.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'sibiu' } }),
    );
    expect(prisma.cityBrand.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cityId_brand: { cityId: 'city-1', brand: Brand.revery } },
        create: { cityId: 'city-1', brand: Brand.revery },
      }),
    );
    const data = prisma.property.create.mock.calls[0][0].data;
    expect(data.cityId).toBe('city-1');
    expect(data.tier).toBe(PropertyTier.affordable);
  });

  it('defaults to luxury → TGE when no tier is provided', async () => {
    const { svc, prisma } = makeService();
    await svc.create(dto());

    expect(prisma.cityBrand.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { cityId: 'city-1', brand: Brand.tge } }),
    );
    expect(prisma.property.create.mock.calls[0][0].data.tier).toBe(
      PropertyTier.luxury,
    );
  });

  it('leaves cityId null (no throw, no tag) when the slug matches no City', async () => {
    const { svc, prisma } = makeService(false);
    const created = await svc.create(dto({ tier: 'affordable' }));

    expect(prisma.cityBrand.upsert).not.toHaveBeenCalled();
    expect(prisma.property.create.mock.calls[0][0].data.cityId).toBeNull();
    expect(created.id).toBe('p1');
  });
});
