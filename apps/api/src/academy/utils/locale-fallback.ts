// Thin re-export shim. Academy callers still import from this module path;
// the canonical implementation now lives in @tge/locale and is shared with
// every frontend app and the rest of the API. Delete this file once all
// academy call sites have been migrated to `@tge/locale` directly.
//
// `SupportedLocale` is preserved as an alias for the new `Locale` name so
// existing type annotations continue to compile.
import {
  type Locale,
  pickLocalized as pickLocalizedShared,
  normalizeLocale as normalizeLocaleShared,
  FALLBACK_CHAINS,
  locales,
} from '@tge/locale';

export type SupportedLocale = Locale;

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = locales;

export const FALLBACK_ORDER: Record<SupportedLocale, SupportedLocale[]> = {
  ro: [...FALLBACK_CHAINS.ro],
  en: [...FALLBACK_CHAINS.en],
  fr: [...FALLBACK_CHAINS.fr],
  de: [...FALLBACK_CHAINS.de],
};

export function pickLocalized(
  value: unknown,
  requested: SupportedLocale,
): { text: string; servedLocale: SupportedLocale } {
  return pickLocalizedShared(value, requested);
}

export function normalizeLocale(raw: string | undefined | null): SupportedLocale {
  return normalizeLocaleShared(raw);
}
