import type { Prisma } from '@prisma/client';
import type { SiteConfigService } from '../../site-config/site-config.service';
import { SiteContext, SiteId } from './site.types';

/**
 * Per-brand geographic scope used by every public read path.
 *
 * `counties`:
 *   `null`   → unrestricted (REVERIA, ADMIN)
 *   `[]`     → match-nothing clamp (UNKNOWN — never leak)
 *   `[...]`  → county-slug allowlist (TGE_LUXURY, admin-configurable)
 *
 * `hiddenCitySlugs`:
 *   Always an array. TGE-only denylist; Reveria/Admin/UNKNOWN see `[]` so
 *   the helpers below can compose without site-aware branching at call sites.
 *
 * Returning a single object keeps the call sites consistent — most readers
 * forward the whole `scope` to one of the `*Where` helpers below, so widening
 * the contract from a bare array to `{counties, hiddenCitySlugs}` avoids a
 * second `await` on every hot path.
 */
export interface GeoScope {
  counties: readonly string[] | null;
  hiddenCitySlugs: readonly string[];
}

const EMPTY_HIDDEN: readonly string[] = Object.freeze([]);

/**
 * Sister concept to `SITE_TIER_SCOPE` — resolves the brand's geographic
 * scope. Only TGE consults the SiteConfig getters; Reveria/Admin short-circuit
 * to "unrestricted" so a Postgres blip on the site_config row can't 500
 * their pages, and UNKNOWN clamps to "match nothing".
 */
export async function resolveGeoScope(
  site: SiteContext,
  siteConfig: SiteConfigService,
): Promise<GeoScope> {
  if (site.id === SiteId.TGE_LUXURY) {
    const [counties, hiddenCitySlugs] = await Promise.all([
      siteConfig.getTgeCountyScope(),
      siteConfig.getTgeHiddenCities(),
    ]);
    return { counties, hiddenCitySlugs };
  }
  if (site.id === SiteId.UNKNOWN) {
    return { counties: [], hiddenCitySlugs: EMPTY_HIDDEN };
  }
  return { counties: null, hiddenCitySlugs: EMPTY_HIDDEN };
}

/**
 * Prisma `where` fragment that clamps City queries to the allowed counties
 * minus any explicitly hidden city slugs. Returns `undefined` for fully
 * unrestricted scopes so callers don't add a no-op filter.
 */
export function cityGeoWhere(
  scope: GeoScope,
): Prisma.CityWhereInput | undefined {
  const clauses: Prisma.CityWhereInput[] = [];
  if (scope.counties !== null) {
    if (scope.counties.length === 0) {
      // Empty allowlist — clamp the entire query to a row that can't exist.
      // Returning early keeps the impossible predicate uncomposed so callers
      // don't AND it with a hidden-city denylist that would never apply.
      return { id: '__none__' };
    }
    clauses.push({ county: { slug: { in: [...scope.counties] } } });
  }
  if (scope.hiddenCitySlugs.length > 0) {
    clauses.push({ slug: { notIn: [...scope.hiddenCitySlugs] } });
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

/**
 * Prisma `where` fragment for Property queries. Uses the modern FK path
 * (`cityRef.county.slug` / `cityRef.slug`) rather than the denormalized
 * `countySlug` column so we're not re-entrenching a field already flagged
 * for removal. Properties without `cityId` backfilled are excluded from any
 * scoped view — the backfill SQL in `prisma/backfill-city-county-ids.sql`
 * is a deploy prerequisite.
 */
export function propertyGeoWhere(
  scope: GeoScope,
): Prisma.PropertyWhereInput | undefined {
  const cityFilters: Prisma.CityWhereInput[] = [];
  if (scope.counties !== null) {
    if (scope.counties.length === 0) {
      return { id: '__none__' };
    }
    cityFilters.push({ county: { slug: { in: [...scope.counties] } } });
  }
  if (scope.hiddenCitySlugs.length > 0) {
    cityFilters.push({ slug: { notIn: [...scope.hiddenCitySlugs] } });
  }
  if (cityFilters.length === 0) return undefined;
  const cityWhere: Prisma.CityWhereInput =
    cityFilters.length === 1 ? cityFilters[0] : { AND: cityFilters };
  return { cityRef: { is: cityWhere } };
}

/**
 * True when the given county slug is within the site's allowlist. Used by
 * single-row reads (cities.findBySlug, properties.findBySlug) to 404 — not
 * 403 — on out-of-scope lookups, matching `assertTierInScope` semantics so
 * we don't leak the existence of out-of-scope rows.
 *
 * Note: this only checks the county allowlist. The hidden-city check lives
 * in `isCityVisible` so single-row lookups can chain both gates explicitly
 * (a missing county slug must 404, an empty city slug should not).
 */
export function isCountyInScope(
  countySlug: string | null | undefined,
  scope: GeoScope,
): boolean {
  if (scope.counties === null) return true;
  if (!countySlug) return false;
  return scope.counties.includes(countySlug);
}

/**
 * True when the given city slug is not on the site's hidden-city denylist.
 * Cheap allow-by-default check — an empty/missing slug passes (we have no
 * basis to deny it; the county allowlist already handles the unmapped case).
 */
export function isCityVisible(
  citySlug: string | null | undefined,
  scope: GeoScope,
): boolean {
  if (scope.hiddenCitySlugs.length === 0) return true;
  if (!citySlug) return true;
  return !scope.hiddenCitySlugs.includes(citySlug);
}
