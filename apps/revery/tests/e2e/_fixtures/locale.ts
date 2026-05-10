export const LOCALES = ['ro', 'en', 'fr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ro';

export function localePath(locale: Locale, path: string = ''): string {
  const trimmed = path.replace(/^\/+/, '');
  return trimmed ? `/${locale}/${trimmed}` : `/${locale}`;
}

const TOOLS_SEGMENT: Record<Locale, string> = {
  ro: 'instrumente',
  en: 'tools',
  fr: 'outils',
  de: 'werkzeuge',
};

const TOOL_SLUGS = {
  mortgage: { ro: 'calculator-ipotecar', en: 'mortgage-calculator', fr: 'calculateur-hypothecaire', de: 'hypothekenrechner' },
  borrowing: { ro: 'capacitate-imprumut', en: 'borrowing-capacity', fr: 'capacite-emprunt', de: 'kreditkapazitaet' },
  purchase: { ro: 'costuri-achizitie', en: 'purchase-costs', fr: 'frais-d-achat', de: 'kaufkosten' },
  rental: { ro: 'randament-inchiriere', en: 'rental-yield', fr: 'rendement-locatif', de: 'mietrendite' },
} as const;

export function toolsHubPath(locale: Locale): string {
  return localePath(locale, TOOLS_SEGMENT[locale]);
}

export function toolPath(locale: Locale, tool: keyof typeof TOOL_SLUGS): string {
  return localePath(locale, `${TOOLS_SEGMENT[locale]}/${TOOL_SLUGS[tool][locale]}`);
}
