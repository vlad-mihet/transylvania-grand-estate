import { Brand, type Prisma } from '@prisma/client';
import { SiteContext, SiteId } from './site.types';

/**
 * Bridge between the legacy `SiteId` enum (carried on every request via the
 * `X-Site` header + `SiteMiddleware`) and the `Brand` enum that drives
 * per-city visibility. ADMIN, ACADEMY, and UNKNOWN resolve to `null` —
 * admin sees every brand, academy doesn't surface cities, and UNKNOWN
 * clamps to "match nothing" via callers. Counties are universal across
 * brands and are not filtered through this layer.
 */
export function brandFromSiteId(siteId: SiteId): Brand | null {
  if (siteId === SiteId.TGE_LUXURY) return Brand.tge;
  if (siteId === SiteId.REVERY) return Brand.revery;
  return null;
}

/**
 * Sentinel where-clause that matches no rows. Used when the site is UNKNOWN
 * (an unresolved X-Site header should never leak data) — callers AND it into
 * their query so the result is empty without throwing.
 */
const NEVER: Prisma.CityWhereInput = { id: '__never__' };

/**
 * Prisma `where` for City queries scoped to the site's brand. Returns
 * `undefined` for ADMIN (no filter), the brand-membership filter for
 * TGE/REVERY, and the never-match clamp for UNKNOWN.
 */
export function cityBrandWhere(
  site: SiteContext,
): Prisma.CityWhereInput | undefined {
  if (site.id === SiteId.UNKNOWN) return NEVER;
  const brand = brandFromSiteId(site.id);
  if (brand === null) return undefined;
  return { brands: { some: { brand } } };
}

/**
 * Prisma `where` for Property queries scoped via the city FK. Mirrors
 * `cityBrandWhere` but wraps in `{ cityRef: { is: ... } }` so the same
 * gate applies on the Property table.
 */
export function propertyBrandWhere(
  site: SiteContext,
): Prisma.PropertyWhereInput | undefined {
  if (site.id === SiteId.UNKNOWN) return { id: '__never__' };
  const brand = brandFromSiteId(site.id);
  if (brand === null) return undefined;
  return { cityRef: { is: { brands: { some: { brand } } } } };
}

/**
 * Single-row gate: is this city tagged with the site's brand? Used by
 * `cities.findBySlug` etc. to 404 (not 403) on out-of-scope lookups so we
 * don't leak the existence of cities that don't belong to the brand.
 */
export async function isCityInBrand(
  site: SiteContext,
  citySlug: string,
  prisma: { cityBrand: { findFirst: (args: unknown) => Promise<unknown> } },
): Promise<boolean> {
  if (site.id === SiteId.UNKNOWN) return false;
  const brand = brandFromSiteId(site.id);
  if (brand === null) return true;
  const row = await prisma.cityBrand.findFirst({
    where: { brand, city: { slug: citySlug } },
    select: { brand: true },
  });
  return row !== null;
}

