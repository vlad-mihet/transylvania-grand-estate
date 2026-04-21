import type { Prisma } from '@prisma/client';
import { SITE_TIER_SCOPE, SiteContext } from './site.types';

/**
 * Prisma `tier` filter matching the caller's site scope. Shared across every
 * query that returns Property rows — including ones embedded as a relation
 * on Agent and Developer — so brand isolation doesn't depend on each module
 * remembering to reimplement the scope logic.
 *
 *   `undefined` → no filter (ADMIN, unrestricted)
 *   `{ in: [] }` → match nothing (UNKNOWN — clamp to empty rather than leak)
 *   `PropertyTier` → single-tier pin (TGE_LUXURY, REVERIA)
 *   `{ in: [...] }` → multi-tier (reserved for future sites)
 */
export function tierScopeFilter(
  site: SiteContext,
): Prisma.PropertyWhereInput['tier'] | undefined {
  const scope = SITE_TIER_SCOPE[site.id];
  if (scope === null) return undefined;
  if (scope.length === 0) return { in: [] };
  if (scope.length === 1) return scope[0];
  return { in: scope };
}

/**
 * Layer tier + optional geo `where` clauses onto an existing Prisma include
 * shape for a nested Property relation (Agent → properties, Developer →
 * properties). Returns the base unchanged when nothing restricts the view so
 * we don't add a no-op filter for REVERIA/ADMIN callers.
 *
 * `geo` is resolved up-front by the caller via `propertyGeoWhere(scope)` so
 * this helper stays synchronous — async plumbing shouldn't propagate into
 * every include shape.
 */
export function scopedPropertiesInclude<T extends object>(
  site: SiteContext,
  base: T,
  geo?: Prisma.PropertyWhereInput,
): T & { where?: Prisma.PropertyWhereInput } {
  const tier = tierScopeFilter(site);
  if (tier === undefined && !geo) return base;

  const where: Prisma.PropertyWhereInput = {};
  if (tier !== undefined) where.tier = tier;
  if (geo) Object.assign(where, geo);
  return { ...base, where };
}
