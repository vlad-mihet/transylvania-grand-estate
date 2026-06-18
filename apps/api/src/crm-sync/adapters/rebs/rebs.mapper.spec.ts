import { PropertyType } from '@prisma/client';
import { mapRebsProperty } from './rebs.mapper';
import { RebsProperty } from './rebs.types';

/**
 * The mapper is the only file that knows REBS field names — it's the lossy
 * boundary between the CRM blob and our canonical model. These tests lock the
 * contract: which listings we skip, how Romanian-only fields land, how tags
 * split into amenities vs features, and how sparse specs become nullable
 * (NOT defaulted — defaulting is the core's job).
 */
describe('mapRebsProperty', () => {
  const base = (over: Partial<RebsProperty> = {}): RebsProperty =>
    ({
      internal_id: 'REBS-100',
      property_type: 'Apartament',
      for_sale: true,
      price_sale: 250000,
      currency_sale: 'EUR',
      title: 'Apartament 3 camere Gheorgheni',
      description: 'Apartament spațios, complet renovat.',
      city: 'Cluj-Napoca',
      zone: 'Gheorgheni',
      lat: 46.77,
      lng: 23.6,
      bedrooms: 2,
      bathrooms: 1,
      surface_total: 75,
      building_construction_year: 2015,
      tags: ['Balcon', 'Centru istoric'],
      tags_en: ['Balcony', 'Historic center'],
      full_images: ['https://cdn.rebs.ro/a.jpg', 'https://cdn.rebs.ro/b.jpg'],
      thumbnail: 'https://cdn.rebs.ro/thumb.jpg',
      ...over,
    }) as RebsProperty;

  it('maps a valid for-sale apartment to the canonical shape', () => {
    const r = mapRebsProperty(base());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const l = r.listing;
    expect(l.source).toBe('rebs');
    expect(l.externalId).toBe('REBS-100');
    expect(l.type).toBe(PropertyType.apartment);
    expect(l.price).toBe(250000);
    expect(l.currency).toBe('EUR');
    expect(l.title.ro).toContain('Apartament');
    expect(l.title.en).toBeUndefined(); // EN is backfilled later, not by the mapper
    expect(l.citySlug).toBe('cluj-napoca');
    expect(l.neighborhood).toBe('Gheorgheni');
    expect(l.coordinates).toEqual({ lat: 46.77, lng: 23.6 });
    expect(l.bedrooms).toBe(2);
    expect(l.area).toBe(75);
    expect(l.yearBuilt).toBe(2015);
  });

  it('routes recognized tags to amenities and the rest to features', () => {
    const r = mapRebsProperty(base());
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.amenities.hasBalcony).toBe(true);
    // "Centru istoric" is not an amenity → becomes a feature with its EN pair.
    expect(r.listing.features).toContainEqual({
      ro: 'Centru istoric',
      en: 'Historic center',
    });
  });

  it('marks the thumbnail as hero and self-hosts nothing (URLs only)', () => {
    const r = mapRebsProperty(base());
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.images[0]).toMatchObject({
      sourceUrl: 'https://cdn.rebs.ro/thumb.jpg',
      isHero: true,
      sortOrder: 0,
    });
    expect(r.listing.images.every((i) => i.sourceUrl.startsWith('https://'))).toBe(
      true,
    );
  });

  it('keeps source currency (conversion is the core brand-route stage)', () => {
    const r = mapRebsProperty(base({ currency_sale: 'RON', price_sale: 1200000 }));
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.currency).toBe('RON');
    expect(r.listing.price).toBe(1200000);
  });

  it('leaves missing specs null for the core to default', () => {
    const r = mapRebsProperty(
      base({ bedrooms: null, surface_total: null, lat: null, lng: null }),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.bedrooms).toBeNull();
    expect(r.listing.area).toBeNull();
    expect(r.listing.coordinates).toBeNull();
  });

  it('skips rent-only listings', () => {
    const r = mapRebsProperty(
      base({ for_sale: false, for_rent: true }),
    );
    expect(r.ok).toBe(false);
  });

  it('skips listings with no sale price', () => {
    expect(mapRebsProperty(base({ price_sale: null })).ok).toBe(false);
    expect(mapRebsProperty(base({ price_sale: 0 })).ok).toBe(false);
  });

  it('skips unmappable property types', () => {
    const r = mapRebsProperty(base({ property_type: 'Spațiu industrial' }));
    expect(r.ok).toBe(false);
  });

  it('skips a listing with a missing currency (no silent EUR default)', () => {
    const r = mapRebsProperty(base({ currency_sale: null }));
    expect(r.ok).toBe(false);
    // The skip carries the id so the core excludes it from the delete set.
    if (!r.ok) expect(r.externalId).toBe('REBS-100');
  });

  it('skips an unsupported currency (only EUR/RON are trusted)', () => {
    expect(mapRebsProperty(base({ currency_sale: 'USD' })).ok).toBe(false);
  });

  it('skips a reserved/withdrawn listing (availability falsy)', () => {
    expect(mapRebsProperty(base({ availability: false })).ok).toBe(false);
  });

  it('imports when availability is explicitly truthy', () => {
    expect(mapRebsProperty(base({ availability: 1 })).ok).toBe(true);
  });

  it('handles numeric strings and the for_sale "1" flag', () => {
    const r = mapRebsProperty(
      base({ for_sale: '1', price_sale: '199999', surface_total: '64.5' }),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.price).toBe(199999);
    expect(r.listing.area).toBe(64.5);
  });
});
