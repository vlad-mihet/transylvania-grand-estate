export type SupportedLocale = 'ro' | 'en' | 'fr' | 'de';

/**
 * Ordered list used for fallback walks. RO is the primary language (Romanian
 * real-estate content) so it's always the last resort even when the requested
 * locale differs — matches the i18n decision in the plan.
 */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['ro', 'en', 'fr', 'de'];

const FALLBACK_ORDER: Record<SupportedLocale, SupportedLocale[]> = {
  ro: ['ro', 'en', 'fr', 'de'],
  en: ['en', 'ro', 'fr', 'de'],
  fr: ['fr', 'en', 'ro', 'de'],
  de: ['de', 'en', 'ro', 'fr'],
};

/**
 * Pick the first non-empty value from a LocalizedString JSON blob following
 * the fallback order for `requested`. Returns the served string + the locale
 * it was read from so the client can render a "translation pending" badge.
 */
export function pickLocalized(
  value: unknown,
  requested: SupportedLocale,
): { text: string; servedLocale: SupportedLocale } {
  if (!isLocalizedObject(value)) {
    return { text: '', servedLocale: requested };
  }
  const chain = FALLBACK_ORDER[requested];
  for (const locale of chain) {
    const candidate = value[locale];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return { text: candidate, servedLocale: locale };
    }
  }
  return { text: '', servedLocale: requested };
}

export function normalizeLocale(raw: string | undefined | null): SupportedLocale {
  if (!raw) return 'ro';
  const head = raw.toLowerCase().split(',')[0]?.split('-')[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(head ?? '')
    ? (head as SupportedLocale)
    : 'ro';
}

function isLocalizedObject(
  value: unknown,
): value is Partial<Record<SupportedLocale, string>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
