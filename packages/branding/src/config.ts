import type { Brand, SiteId } from "./types";

// Brand catalogue. Luxury: 1M+ EUR, Reveria: 1–999,999 EUR. Admin reuses the
// luxury brand by default for the dashboard chrome; admin screens read from
// the entity being edited, so this value just controls the shell.
export const BRAND_CONFIG: Record<SiteId, Brand> = {
  TGE_LUXURY: {
    siteId: "TGE_LUXURY",
    key: "tge",
    name: "Transylvania Grand Estate",
    tagline: "Curated luxury properties in Transylvania",
    tier: "luxury",
    priceRange: { min: 1_000_000, max: 50_000_000 },
  },
  REVERIA: {
    siteId: "REVERIA",
    key: "reveria",
    name: "Reveria",
    tagline: "Approachable homes across Romania",
    tier: "affordable",
    priceRange: { min: 10_000, max: 999_000 },
  },
  ADMIN: {
    siteId: "ADMIN",
    key: "admin",
    name: "TGE Admin",
    tagline: "Internal dashboard",
    tier: "luxury",
    priceRange: { min: 0, max: Number.MAX_SAFE_INTEGER },
  },
};

const DEFAULT_SITE: SiteId = "TGE_LUXURY";

function normalizeSiteId(raw: string | undefined): SiteId {
  if (raw === "TGE_LUXURY" || raw === "REVERIA" || raw === "ADMIN") return raw;
  return DEFAULT_SITE;
}

/**
 * Resolve the current brand from NEXT_PUBLIC_SITE_ID. Each Next app sets this
 * in its next.config.ts. If unset or unknown, falls back to TGE_LUXURY so the
 * app renders instead of crashing — mismatched copy is a better failure mode
 * than a blank page.
 */
export function getBrand(): Brand {
  const siteId = normalizeSiteId(process.env.NEXT_PUBLIC_SITE_ID);
  return BRAND_CONFIG[siteId];
}

export function getBrandBySiteId(siteId: SiteId): Brand {
  return BRAND_CONFIG[siteId];
}
