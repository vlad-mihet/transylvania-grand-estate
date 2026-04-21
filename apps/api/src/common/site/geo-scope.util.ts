import type { Prisma } from '@prisma/client';
import type { SiteConfigService } from '../../site-config/site-config.service';
import { SiteContext, SiteId } from './site.types';

/**
 * Brand-scoped county allowlist, sister concept to `SITE_TIER_SCOPE`.
 *
 *   `null`   → unrestricted (REVERIA, ADMIN)
 *   `[]`     → match-nothing (UNKNOWN — clamp rather than leak)
 *   `[...]`  → slug allowlist (TGE_LUXURY, admin-configurable via SiteConfig)
 *
 * Only the TGE landing site is geo-scoped today. Reveria intentionally sees
 * all of Romania. Admin sees everything. Unknown origins return empty to
 * mirror the existing tier-scope clamp.
 */
export async function resolveGeoScope(
  site: SiteContext,
  siteConfig: SiteConfigService,
): Promise<readonly string[] | null> {
  if (site.id === SiteId.TGE_LUXURY) return siteConfig.getTgeCountyScope();
  if (site.id === SiteId.UNKNOWN) return [];
  return null;
}

/**
 * Prisma `where` fragment that clamps City queries to the allowed counties.
 * Returns `undefined` for unrestricted sites so callers don't add a no-op
 * filter. For an empty scope we return an impossible clause so results are
 * empty rather than leaking the full list.
 */
export function cityGeoWhere(
  scope: readonly string[] | null,
): Prisma.CityWhereInput | undefined {
  if (scope === null) return undefined;
  if (scope.length === 0) return { id: '__none__' };
  return { county: { slug: { in: [...scope] } } };
}

/**
 * Prisma `where` fragment for Property queries. Uses the modern FK path
 * (`cityRef.county.slug`) rather than the denormalized `countySlug` column
 * so we're not re-entrenching a field already flagged for removal. Properties
 * without `cityId` backfilled are excluded from the TGE view — the backfill
 * SQL in `prisma/backfill-city-county-ids.sql` is a deploy prerequisite.
 */
export function propertyGeoWhere(
  scope: readonly string[] | null,
): Prisma.PropertyWhereInput | undefined {
  if (scope === null) return undefined;
  if (scope.length === 0) return { id: '__none__' };
  return { cityRef: { is: { county: { slug: { in: [...scope] } } } } };
}

/**
 * True when the given county slug is within the site's allowlist. Used by
 * single-row reads (cities.findBySlug, properties.findBySlug) to 404 — not
 * 403 — on out-of-scope lookups, matching `assertTierInScope` semantics so
 * we don't leak the existence of out-of-scope rows.
 */
export function isCountyInScope(
  countySlug: string | null | undefined,
  scope: readonly string[] | null,
): boolean {
  if (scope === null) return true;
  if (!countySlug) return false;
  return scope.includes(countySlug);
}
