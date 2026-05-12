import { test, expect } from '@playwright/test';
import {
  adminApi,
  apiAsBrand,
  findPropertyBySlug,
  getAdminAccessToken,
  type ApiEnvelope,
  type PropertySummary,
} from './_fixtures/api';

/**
 * The most load-bearing spec in this suite: brand isolation.
 *
 * Property creation requires 30+ fields (slug, title, description, address,
 * coordinates, type, bedrooms, bathrooms, area, floors, yearBuilt, plus 18
 * amenity flags). That much UI clicking belongs in the manual checklist; here
 * we PATCH existing seeded properties to prove the WIRE-LEVEL brand isolation
 * + status PATCH still hold. If this red-lines, the demo is at risk.
 *
 * To avoid the city_brands gate (some affordable properties live in cities
 * not tagged for REVERY → 404 from REVERY even though tier matches), we pick
 * test fixtures by querying as the brand itself, not as ADMIN.
 */
test.describe('properties brand isolation + status PATCH', () => {
  test('a luxury property visible to TGE_LUXURY is invisible to REVERY', async () => {
    // Pick a property that's already visible to TGE_LUXURY (so it passes
    // both tier-scope AND city-brand gates).
    const env = await apiAsBrand<PropertySummary[]>(
      'TGE_LUXURY',
      '/properties?limit=1',
    );
    const luxury = env.data?.[0];
    expect(luxury, 'No luxury property visible to TGE_LUXURY — seed first').toBeDefined();
    expect(luxury!.tier).toBe('luxury');

    // Same slug as REVERY → must 404.
    const onRevery = await findPropertyBySlug('REVERY', luxury!.slug);
    expect(onRevery, `${luxury!.slug} must NOT be visible to REVERY`).toBeNull();
  });

  test('an affordable property visible to REVERY is invisible to TGE_LUXURY', async () => {
    const env = await apiAsBrand<PropertySummary[]>(
      'REVERY',
      '/properties?limit=1',
    );
    const affordable = env.data?.[0];
    expect(
      affordable,
      'No affordable property visible to REVERY — seed first',
    ).toBeDefined();
    expect(affordable!.tier).toBe('affordable');

    const onLanding = await findPropertyBySlug('TGE_LUXURY', affordable!.slug);
    expect(onLanding, `${affordable!.slug} must NOT leak to TGE_LUXURY`).toBeNull();
  });

  test('cross-tier query bypass attempt is rejected by middleware', async () => {
    // Revery client tries to peek at luxury via a query param. Middleware
    // wins (`SITE_TIER_SCOPE[REVERY] = [affordable]`); the response should
    // contain only affordable rows regardless of the `tier=luxury` filter.
    const env = await apiAsBrand<PropertySummary[]>(
      'REVERY',
      '/properties?tier=luxury&limit=20',
    );
    const leaks = env.data.filter((p) => p.tier === 'luxury');
    expect(leaks, 'Tier-scope leak: REVERY can see luxury rows').toHaveLength(0);
  });

  test('admin PATCH status round-trips through the API', async () => {
    const token = getAdminAccessToken();
    const env = await adminApi<ApiEnvelope<PropertySummary[]>>(
      token,
      '/properties?status=available&limit=1',
    );
    const target = env.data?.[0];
    expect(target).toBeDefined();
    const id = target!.id;
    const originalStatus = target!.status ?? 'available';

    try {
      await adminApi(token, `/properties/${id}`, {
        method: 'PATCH',
        body: { status: 'reserved' },
      });
      const refetched = await adminApi<ApiEnvelope<PropertySummary>>(
        token,
        `/properties/id/${id}`,
      );
      expect(refetched.data.status).toBe('reserved');
    } finally {
      await adminApi(token, `/properties/${id}`, {
        method: 'PATCH',
        body: { status: originalStatus },
      }).catch(() => undefined);
    }
  });
});
