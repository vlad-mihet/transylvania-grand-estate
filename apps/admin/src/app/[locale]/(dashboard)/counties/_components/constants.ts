// Preset allowlists for the two common definitions of Transylvania. Kept
// here (not in a shared package) so the admin UX stays self-contained and a
// marketing-led redefinition is a one-line PR against the view that uses
// them. The API has its own independent default (DEFAULT_TGE_COUNTY_SCOPE
// in site-config.service.ts) — divergence is fine because this is just
// "what preset buttons apply," not authoritative scope.
export const TRANSYLVANIA_STRICT = [
  "alba",
  "bistrita-nasaud",
  "brasov",
  "cluj",
  "covasna",
  "harghita",
  "hunedoara",
  "mures",
  "salaj",
  "sibiu",
];

export const TRANSYLVANIA_EXTENDED = [
  ...TRANSYLVANIA_STRICT,
  "bihor",
  "maramures",
  "satu-mare",
];

export const SORT_TOKENS = {
  name: { asc: "name_asc", desc: "name_desc" },
  code: { asc: "code_asc", desc: "code_desc" },
  createdAt: { asc: "oldest", desc: "newest" },
} as const;

// Narrow view on SiteConfig — only the field this page writes to.
export interface SiteConfigScope {
  tgeCountyScope?: string[];
}
