import { defaultLocale, isLocale, locales, type Locale } from "./constants";

/**
 * Localized string payload as it lands on the wire and in Prisma `Json`
 * columns. Every key is optional — content gets filled per locale at
 * different times, and the read path is fallback-aware.
 */
export type LocalizedString = Partial<Record<Locale, string>>;

/**
 * Fallback walk order per requesting locale. RO is the primary language
 * (Romanian real-estate content) so non-RO requests still resolve to RO
 * when their preferred locale has no copy yet.
 */
export const FALLBACK_CHAINS: Readonly<Record<Locale, readonly Locale[]>> = {
  ro: ["ro", "en", "fr", "de"],
  en: ["en", "ro", "fr", "de"],
  fr: ["fr", "en", "ro", "de"],
  de: ["de", "en", "ro", "fr"],
};

function isPlainLocalizedObject(value: unknown): value is LocalizedString {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read a `LocalizedString` value following the fallback chain for `requested`.
 * Returns the served text plus the locale it actually came from — callers
 * surface that in API responses (`_servedLocale`) so the client can render a
 * "translation pending" badge when fallback kicks in.
 *
 * Empty strings count as missing; trim is preserved otherwise.
 */
export function pickLocalized(
  value: unknown,
  requested: Locale,
): { text: string; servedLocale: Locale } {
  if (!isPlainLocalizedObject(value)) {
    return { text: "", servedLocale: requested };
  }
  for (const candidate of FALLBACK_CHAINS[requested]) {
    const raw = value[candidate];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return { text: raw, servedLocale: candidate };
    }
  }
  return { text: "", servedLocale: requested };
}

/**
 * Coerce any input to a supported `Locale`. Handles common shapes:
 *  - exact match (`"ro"`)
 *  - region-qualified BCP-47 tag (`"fr-FR"` → `"fr"`)
 *  - first entry of a comma list (`"en-GB,en;q=0.9"` → `"en"`); use
 *    `negotiateLocale` instead if you need quality-aware matching.
 *  - case-insensitive (`"EN"` → `"en"`).
 *
 * Falls back to `fallback` (default `defaultLocale`) when no match.
 */
export function normalizeLocale(
  raw: string | null | undefined,
  fallback: Locale = defaultLocale,
): Locale {
  if (!raw) return fallback;
  const head = raw.toLowerCase().split(",")[0]?.split("-")[0]?.trim();
  return isLocale(head) ? head : fallback;
}

/**
 * Check whether a single locale slot on a `LocalizedString` is populated.
 * Used by the admin translation queue + per-locale completeness badges.
 */
export function isLocalizedFilled(
  value: unknown,
  locale: Locale,
): boolean {
  if (!isPlainLocalizedObject(value)) return false;
  const raw = value[locale];
  return typeof raw === "string" && raw.trim().length > 0;
}

/**
 * How many supported locales have non-empty content. Convenience for
 * editor UIs that show "3 of 4 translated".
 */
export function countFilledLocales(value: unknown): number {
  if (!isPlainLocalizedObject(value)) return 0;
  let n = 0;
  for (const locale of locales) {
    if (isLocalizedFilled(value, locale)) n += 1;
  }
  return n;
}
