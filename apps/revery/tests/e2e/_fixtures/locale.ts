export const LOCALES = ['ro', 'en', 'fr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ro';

export function localePath(locale: Locale, path: string = ''): string {
  const trimmed = path.replace(/^\/+/, '');
  return trimmed ? `/${locale}/${trimmed}` : `/${locale}`;
}

// Tool URLs use the canonical Romanian segments in EVERY locale: the per-locale
// `pathnames` rewrite map was removed (incompatible with next-intl@4.8.3 +
// next@16 — it 404'd all nested routes), so /en/tools/... etc. no longer exist.
const TOOLS_SEGMENT = 'instrumente';

const TOOL_SLUGS = {
  mortgage: 'calculator-ipotecar',
  borrowing: 'capacitate-imprumut',
  purchase: 'costuri-achizitie',
  rental: 'randament-inchiriere',
} as const;

export function toolsHubPath(locale: Locale): string {
  return localePath(locale, TOOLS_SEGMENT);
}

export function toolPath(locale: Locale, tool: keyof typeof TOOL_SLUGS): string {
  return localePath(locale, `${TOOLS_SEGMENT}/${TOOL_SLUGS[tool]}`);
}
