import { PropertyType } from '@prisma/client';
import { mapRebsProperty } from './rebs.mapper';
import { RebsProperty } from './rebs.types';

/**
 * The mapper is the only file that knows REBS field names + code tables — the
 * lossy boundary between the CRM blob and our canonical model. These tests lock
 * the contract against REBS's REAL shape (verified vs the demo feed):
 * `property_type` and `currency_sale` are numeric codes, English lives in
 * `title_en`/`description_en`, and sparse specs stay nullable (the core defaults).
 */
describe('mapRebsProperty', () => {
  const base = (over: Partial<RebsProperty> = {}): RebsProperty =>
    ({
      internal_id: 'REBS-100',
      property_type: 1, // 1 = Apartment
      for_sale: true,
      price_sale: 250000,
      currency_sale: 1, // 1 = EUR
      title: 'Apartament 3 camere Gheorgheni',
      title_en: 'Modern 3-room apartment in Gheorgheni',
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

  it('maps a valid for-sale apartment, decoding numeric type + currency codes', () => {
    const r = mapRebsProperty(base());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const l = r.listing;
    expect(l.source).toBe('rebs');
    expect(l.externalId).toBe('REBS-100');
    expect(l.type).toBe(PropertyType.apartment); // code 1
    expect(l.currency).toBe('EUR'); // code 1
    expect(l.price).toBe(250000);
    expect(l.citySlug).toBe('cluj-napoca');
    expect(l.coordinates).toEqual({ lat: 46.77, lng: 23.6 });
    expect(l.bedrooms).toBe(2);
    expect(l.area).toBe(75);
  });

  it('uses title_en / description_en for the English locale when present', () => {
    const r = mapRebsProperty(
      base({ title_en: 'Lovely flat', description_en: 'A lovely flat.' }),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.title.ro).toContain('Apartament');
    expect(r.listing.title.en).toBe('Lovely flat');
    expect(r.listing.description.en).toBe('A lovely flat.');
  });

  it('leaves English unset when REBS has no _en (core backfills + flags it)', () => {
    const r = mapRebsProperty(base({ title_en: '', description_en: undefined }));
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.title.en).toBeUndefined();
    expect(r.listing.description.en).toBeUndefined();
  });

  it('decodes RON currency (code 2) and keeps the source amount', () => {
    const r = mapRebsProperty(base({ currency_sale: 2, price_sale: 1200000 }));
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.currency).toBe('RON'); // conversion happens in brand-route
    expect(r.listing.price).toBe(1200000);
  });

  it('routes recognized tags to amenities and the rest to features', () => {
    const r = mapRebsProperty(base());
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.amenities.hasBalcony).toBe(true);
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
  });

  it('falls back to the numeric id when internal_id is empty (common in REBS)', () => {
    const r = mapRebsProperty(base({ internal_id: '', id: 954520 }));
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.externalId).toBe('954520');
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
    expect(mapRebsProperty(base({ for_sale: false, for_rent: true })).ok).toBe(false);
  });

  it('skips listings with no sale price', () => {
    expect(mapRebsProperty(base({ price_sale: null })).ok).toBe(false);
    expect(mapRebsProperty(base({ price_sale: 0 })).ok).toBe(false);
  });

  it('skips non-residential property types (office/commercial/industrial)', () => {
    expect(mapRebsProperty(base({ property_type: 4 })).ok).toBe(false); // office
    expect(mapRebsProperty(base({ property_type: 5 })).ok).toBe(false); // commercial
    expect(mapRebsProperty(base({ property_type: 7 })).ok).toBe(false); // industrial
  });

  it('maps house (3) and land (6) codes', () => {
    const house = mapRebsProperty(base({ property_type: 3 }));
    const land = mapRebsProperty(base({ property_type: 6 }));
    if (!house.ok || !land.ok) throw new Error('expected ok');
    expect(house.listing.type).toBe(PropertyType.house);
    expect(land.listing.type).toBe(PropertyType.terrain);
  });

  it('skips unsupported currency codes (USD / unknown)', () => {
    expect(mapRebsProperty(base({ currency_sale: 3 })).ok).toBe(false); // USD
    expect(mapRebsProperty(base({ currency_sale: 9 })).ok).toBe(false);
  });

  it('handles numeric strings on for_sale / price / type / currency', () => {
    const r = mapRebsProperty(
      base({
        for_sale: '1',
        price_sale: '199999',
        property_type: '1',
        currency_sale: '1',
        surface_total: '64.5',
      }),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.listing.price).toBe(199999);
    expect(r.listing.type).toBe(PropertyType.apartment);
    expect(r.listing.currency).toBe('EUR');
    expect(r.listing.area).toBe(64.5);
  });
});
