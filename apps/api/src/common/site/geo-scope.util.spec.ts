import {
  cityGeoWhere,
  isCityVisible,
  isCountyInScope,
  propertyGeoWhere,
  resolveGeoScope,
  type GeoScope,
} from './geo-scope.util';
import { SiteId, type SiteContext } from './site.types';
import type { SiteConfigService } from '../../site-config/site-config.service';

/**
 * Unit tests for the brand geo-scope primitives. No DB — these are pure
 * functions plus one async helper that takes a stub `SiteConfigService`.
 * Runs under `pnpm test:unit` (jest.config.ts) with no Postgres spin-up.
 */
describe('geo-scope util', () => {
  const site = (id: SiteId): SiteContext => ({ id, origin: null });

  /**
   * Compact builder so each spec can declare just the field it cares about.
   * Defaults match the "unrestricted, nothing hidden" shape that
   * resolveGeoScope returns for ADMIN.
   */
  const scopeOf = (overrides: Partial<GeoScope> = {}): GeoScope => ({
    counties: null,
    hiddenCitySlugs: [],
    ...overrides,
  });

  describe('cityGeoWhere', () => {
    it('returns undefined for unrestricted sites with nothing hidden', () => {
      expect(cityGeoWhere(scopeOf())).toBeUndefined();
    });

    it('clamps to match-nothing for an empty county allowlist', () => {
      // Empty counties → match-nothing predicate (UNKNOWN clamp). Returning
      // an impossible predicate (id='__none__') keeps the shape as a valid
      // Prisma.CityWhereInput without relying on a vendor extension.
      expect(cityGeoWhere(scopeOf({ counties: [] }))).toEqual({
        id: '__none__',
      });
    });

    it('filters by the nested county slug relation', () => {
      expect(
        cityGeoWhere(scopeOf({ counties: ['cluj', 'brasov'] })),
      ).toEqual({
        county: { slug: { in: ['cluj', 'brasov'] } },
      });
    });

    it('AND-composes county allowlist with hidden-city denylist', () => {
      // The TGE happy-path: counties scoped, plus one or more cities hidden.
      // The clauses are AND-ed so the SQL stays correct under a future
      // top-level OR-search filter.
      expect(
        cityGeoWhere(
          scopeOf({
            counties: ['mures'],
            hiddenCitySlugs: ['tarnaveni'],
          }),
        ),
      ).toEqual({
        AND: [
          { county: { slug: { in: ['mures'] } } },
          { slug: { notIn: ['tarnaveni'] } },
        ],
      });
    });

    it('returns the hidden-only clause when counties is unrestricted', () => {
      // Conceptually unreachable today (only TGE hides cities, and TGE
      // always has a county scope), but the helper should still degrade
      // sensibly so future brand configs don't surprise callers.
      expect(
        cityGeoWhere(scopeOf({ hiddenCitySlugs: ['tarnaveni'] })),
      ).toEqual({ slug: { notIn: ['tarnaveni'] } });
    });

    it('copies the slug arrays so callers can mutate their input safely', () => {
      const counties = Object.freeze(['cluj']) as readonly string[];
      const hidden = Object.freeze(['tarnaveni']) as readonly string[];
      const where = cityGeoWhere(scopeOf({ counties, hiddenCitySlugs: hidden }));
      // Spreading into a fresh array is the contract; if the util ever
      // starts forwarding the frozen ref, this assertion breaks.
      expect(where).toBeDefined();
      const composed = where as { AND: Array<Record<string, unknown>> };
      const countyArr = (composed.AND[0] as { county: { slug: { in: string[] } } })
        .county.slug.in;
      const hiddenArr = (composed.AND[1] as { slug: { notIn: string[] } }).slug.notIn;
      expect(Object.isFrozen(countyArr)).toBe(false);
      expect(Object.isFrozen(hiddenArr)).toBe(false);
    });
  });

  describe('propertyGeoWhere', () => {
    it('returns undefined for unrestricted sites with nothing hidden', () => {
      expect(propertyGeoWhere(scopeOf())).toBeUndefined();
    });

    it('clamps to match-nothing for an empty county allowlist', () => {
      expect(propertyGeoWhere(scopeOf({ counties: [] }))).toEqual({
        id: '__none__',
      });
    });

    it('uses the modern cityRef FK path, not the deprecated countySlug', () => {
      // Guard against regression: an earlier version filtered via the
      // denormalized `countySlug` column, which the schema flagged for
      // removal. Keep this assertion shape-specific so any drift surfaces.
      expect(propertyGeoWhere(scopeOf({ counties: ['cluj'] }))).toEqual({
        cityRef: { is: { county: { slug: { in: ['cluj'] } } } },
      });
    });

    it('AND-composes county allowlist with hidden-city denylist on cityRef', () => {
      expect(
        propertyGeoWhere(
          scopeOf({
            counties: ['mures'],
            hiddenCitySlugs: ['tarnaveni'],
          }),
        ),
      ).toEqual({
        cityRef: {
          is: {
            AND: [
              { county: { slug: { in: ['mures'] } } },
              { slug: { notIn: ['tarnaveni'] } },
            ],
          },
        },
      });
    });
  });

  describe('isCountyInScope', () => {
    it('passes everything through for a null county allowlist', () => {
      expect(isCountyInScope('anything', scopeOf())).toBe(true);
      expect(isCountyInScope(null, scopeOf())).toBe(true);
    });

    it('fails a null county slug against a non-null allowlist', () => {
      // A Property row with no cityRef is, by definition, outside any named
      // geographic scope. Falsely returning true would leak Bucharest rows
      // (and similar unbackfilled inventory) into the TGE view.
      expect(isCountyInScope(null, scopeOf({ counties: ['cluj'] }))).toBe(false);
      expect(
        isCountyInScope(undefined, scopeOf({ counties: ['cluj'] })),
      ).toBe(false);
    });

    it('matches case-sensitively against the allowlist', () => {
      const scope = scopeOf({ counties: ['cluj', 'brasov'] });
      expect(isCountyInScope('cluj', scope)).toBe(true);
      expect(isCountyInScope('CLUJ', scope)).toBe(false);
      expect(isCountyInScope('constanta', scope)).toBe(false);
    });

    it('empty allowlist denies everything', () => {
      expect(isCountyInScope('cluj', scopeOf({ counties: [] }))).toBe(false);
    });

    it('does not consider the hidden-city list', () => {
      // isCountyInScope is the county gate only. The hidden-city check is
      // a separate concern (`isCityVisible`); conflating them would leak
      // 404 vs 200 information for a city whose county is allowed but
      // whose slug is denylisted.
      expect(
        isCountyInScope(
          'mures',
          scopeOf({ counties: ['mures'], hiddenCitySlugs: ['tarnaveni'] }),
        ),
      ).toBe(true);
    });
  });

  describe('isCityVisible', () => {
    it('allows everything when nothing is hidden', () => {
      expect(isCityVisible('tarnaveni', scopeOf())).toBe(true);
      expect(isCityVisible(null, scopeOf())).toBe(true);
    });

    it('denies city slugs on the hidden list', () => {
      expect(
        isCityVisible(
          'tarnaveni',
          scopeOf({ hiddenCitySlugs: ['tarnaveni'] }),
        ),
      ).toBe(false);
      expect(
        isCityVisible('cluj-napoca', scopeOf({ hiddenCitySlugs: ['tarnaveni'] })),
      ).toBe(true);
    });

    it('allows missing slugs even when a hidden list is present', () => {
      // We have no basis to deny a row without a city slug — the county
      // allowlist is the gate for unmapped rows. Returning true here keeps
      // `isCityVisible` allow-by-default; callers chain with isCountyInScope.
      expect(
        isCityVisible(null, scopeOf({ hiddenCitySlugs: ['tarnaveni'] })),
      ).toBe(true);
    });
  });

  describe('resolveGeoScope', () => {
    /**
     * Minimal stub — typed against the SiteConfigService interface so the
     * stub stays honest if that surface widens. `getTgeHiddenCities`
     * returns `[]` by default, matching the empty-list fallback in the
     * real service.
     */
    function stub(
      counties: readonly string[],
      hidden: readonly string[] = [],
    ): SiteConfigService {
      return {
        getTgeCountyScope: async () => counties,
        getTgeHiddenCities: async () => hidden,
      } as unknown as SiteConfigService;
    }

    it('returns the admin-configured scope for TGE_LUXURY', async () => {
      const result = await resolveGeoScope(
        site(SiteId.TGE_LUXURY),
        stub(['cluj', 'brasov'], ['tarnaveni']),
      );
      expect(result).toEqual({
        counties: ['cluj', 'brasov'],
        hiddenCitySlugs: ['tarnaveni'],
      });
    });

    it('returns unrestricted county scope with public Revery hidden cities', async () => {
      const result = await resolveGeoScope(
        site(SiteId.REVERY),
        stub(['should', 'not', 'be', 'read'], ['ignored']),
      );
      expect(result).toEqual({
        counties: null,
        hiddenCitySlugs: ['reghin', 'tarnaveni'],
      });
    });

    it('returns unrestricted scope for ADMIN', async () => {
      const result = await resolveGeoScope(site(SiteId.ADMIN), stub(['x']));
      expect(result).toEqual({ counties: null, hiddenCitySlugs: [] });
    });

    it('clamps UNKNOWN to empty counties (matches existing tier-scope policy)', async () => {
      // Empty counties → match nothing, not null. An UNKNOWN origin must
      // never leak content regardless of brand config — this mirrors the
      // UNKNOWN clamp in SITE_TIER_SCOPE. hiddenCitySlugs is `[]` because
      // the county clamp already short-circuits the where to id='__none__'.
      const result = await resolveGeoScope(site(SiteId.UNKNOWN), stub(['x']));
      expect(result).toEqual({ counties: [], hiddenCitySlugs: [] });
    });

    it('does not call the site-config service for non-TGE sites', async () => {
      // Guards against a refactor that routes every site through the DB
      // getter — wasteful, and breaks the public Revery city denylist
      // contract if the getter ever throws.
      const getTgeCountyScope = jest.fn<Promise<readonly string[]>, []>();
      const getTgeHiddenCities = jest.fn<Promise<readonly string[]>, []>();
      const revery = {
        getTgeCountyScope,
        getTgeHiddenCities,
      } as unknown as SiteConfigService;
      await resolveGeoScope(site(SiteId.REVERY), revery);
      await resolveGeoScope(site(SiteId.ADMIN), revery);
      await resolveGeoScope(site(SiteId.UNKNOWN), revery);
      expect(getTgeCountyScope).not.toHaveBeenCalled();
      expect(getTgeHiddenCities).not.toHaveBeenCalled();
    });
  });
});
