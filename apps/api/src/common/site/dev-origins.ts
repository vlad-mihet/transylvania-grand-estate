import { SiteId } from './site.types';

/**
 * Single source of truth for local dev origins. Mirrors the
 * `next dev --port` flags in each app's package.json — keep in sync:
 *   apps/landing/package.json   --port 3050
 *   apps/admin/package.json     --port 3051
 *   apps/reveria/package.json   --port 3052
 * Consumed by SiteOriginConfig (brand routing) and the CORS fallback in
 * main.ts. Deliberately not derived at build time; three port flags aren't
 * worth a cross-package-json plumbing layer.
 */
export const DEV_ORIGINS: Record<Exclude<SiteId, SiteId.UNKNOWN>, string[]> = {
  [SiteId.TGE_LUXURY]: ['http://localhost:3050'],
  [SiteId.ADMIN]: ['http://localhost:3051'],
  [SiteId.REVERIA]: ['http://localhost:3052'],
};

export const DEV_ORIGIN_LIST: readonly string[] =
  Object.values(DEV_ORIGINS).flat();
