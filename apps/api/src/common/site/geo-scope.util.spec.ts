import {
  cityGeoWhere,
  isCountyInScope,
  propertyGeoWhere,
  resolveGeoScope,
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

  describe('cityGeoWhere', () => {
    it('returns undefined for unrestricted sites (null scope)', () => {
      expect(cityGeoWhere(null)).toBeUndefined();
    });

    it('clamps to match-nothing for an empty allowlist', () => {
      // Reveria/Admin get null — the empty-array branch is only the UNKNOWN
      // clamp. Returning an impossible predicate (id='__none__') keeps the
      // shape as a valid Prisma.CityWhereInput without relying on a vendor
      // extension like `{ AND: [{ id: 'a' }, { id: 'b' }] }`.
      expect(cityGeoWhere([])).toEqual({ id: '__none__' });
    });

    it('filters by the nested county slug relation', () => {
      expect(cityGeoWhere(['cluj', 'brasov'])).toEqual({
        county: { slug: { in: ['cluj', 'brasov'] } },
      });
    });

    it('copies the slug array so callers can mutate their input safely', () => {
      const scope = Object.freeze(['cluj']) as readonly string[];
      const where = cityGeoWhere(scope);
      // Spreading into a fresh array is the contract; if the util ever
      // starts forwarding the frozen ref, this assertion breaks.
      expect(where).toBeDefined();
      expect(Object.isFrozen((where as { county: { slug: { in: string[] } } }).county.slug.in)).toBe(false);
    });
  });

  describe('propertyGeoWhere', () => {
    it('returns undefined for unrestricted sites', () => {
      expect(propertyGeoWhere(null)).toBeUndefined();
    });

    it('clamps to match-nothing for an empty allowlist', () => {
      expect(propertyGeoWhere([])).toEqual({ id: '__none__' });
    });

    it('uses the modern cityRef FK path, not the deprecated countySlug', () => {
      // Guard against regression: an earlier version filtered via the
      // denormalized `countySlug` column, which the schema flagged for
      // removal. Keep this assertion shape-specific so any drift surfaces.
      expect(propertyGeoWhere(['cluj'])).toEqual({
        cityRef: { is: { county: { slug: { in: ['cluj'] } } } },
      });
    });
  });

  describe('isCountyInScope', () => {
    it('passes everything through for a null scope (unrestricted site)', () => {
      expect(isCountyInScope('anything', null)).toBe(true);
      expect(isCountyInScope(null, null)).toBe(true);
    });

    it('fails a null county slug against a non-null scope', () => {
      // A Property row with no cityRef is, by definition, outside any named
      // geographic scope. Falsely returning true would leak Bucharest rows
      // (and similar unbackfilled inventory) into the TGE view.
      expect(isCountyInScope(null, ['cluj'])).toBe(false);
      expect(isCountyInScope(undefined, ['cluj'])).toBe(false);
    });

    it('matches case-sensitively against the allowlist', () => {
      expect(isCountyInScope('cluj', ['cluj', 'brasov'])).toBe(true);
      expect(isCountyInScope('CLUJ', ['cluj', 'brasov'])).toBe(false);
      expect(isCountyInScope('constanta', ['cluj', 'brasov'])).toBe(false);
    });

    it('empty scope denies everything', () => {
      expect(isCountyInScope('cluj', [])).toBe(false);
    });
  });

  describe('resolveGeoScope', () => {
    // Minimal stub — the util only uses `getTgeCountyScope()`. Typing it as
    // the service interface keeps the stub honest if that surface widens.
    function stub(scope: readonly string[]): SiteConfigService {
      return {
        getTgeCountyScope: async () => scope,
      } as unknown as SiteConfigService;
    }

    it('returns the admin-configured scope for TGE_LUXURY', async () => {
      const result = await resolveGeoScope(
        site(SiteId.TGE_LUXURY),
        stub(['cluj', 'brasov']),
      );
      expect(result).toEqual(['cluj', 'brasov']);
    });

    it('returns null (unrestricted) for REVERIA', async () => {
      const result = await resolveGeoScope(
        site(SiteId.REVERIA),
        stub(['should', 'not', 'be', 'read']),
      );
      expect(result).toBeNull();
    });

    it('returns null for ADMIN', async () => {
      const result = await resolveGeoScope(site(SiteId.ADMIN), stub(['x']));
      expect(result).toBeNull();
    });

    it('clamps UNKNOWN to empty (matches existing tier-scope policy)', async () => {
      // Empty → match nothing, not null. An UNKNOWN origin must never leak
      // content regardless of brand config — this mirrors the UNKNOWN clamp
      // in SITE_TIER_SCOPE.
      const result = await resolveGeoScope(site(SiteId.UNKNOWN), stub(['x']));
      expect(result).toEqual([]);
    });

    it('does not call the site-config service for non-TGE sites', async () => {
      // Guards against a refactor that routes every site through the DB
      // getter — wasteful, and breaks the "Reveria is globally unrestricted"
      // contract if the getter ever throws.
      const getTgeCountyScope = jest.fn<Promise<readonly string[]>, []>();
      const reveria = {
        getTgeCountyScope,
      } as unknown as SiteConfigService;
      await resolveGeoScope(site(SiteId.REVERIA), reveria);
      await resolveGeoScope(site(SiteId.ADMIN), reveria);
      await resolveGeoScope(site(SiteId.UNKNOWN), reveria);
      expect(getTgeCountyScope).not.toHaveBeenCalled();
    });
  });
});
