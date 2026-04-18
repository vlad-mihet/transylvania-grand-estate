// Mirrors apps/api/src/common/site/site.types.ts. Kept as a string-literal
// union (not a cross-package import) so this package stays zero-dep.
export type SiteId = "TGE_LUXURY" | "REVERIA" | "ADMIN";

export type PropertyTier = "luxury" | "affordable";

export interface PriceRange {
  min: number;
  max: number;
}

export interface Brand {
  siteId: SiteId;
  // Machine-readable key for analytics/source tagging (contact form source
  // field, inquiry.source column, etc.). Short, stable, lowercase.
  key: string;
  name: string;
  tagline: string;
  tier: PropertyTier;
  priceRange: PriceRange;
}
