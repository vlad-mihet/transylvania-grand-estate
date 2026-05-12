// next-intl glue
export { routing } from "./routing";
export { Link, redirect, usePathname, useRouter, getPathname } from "./navigation";
export { loadSharedMessages, mergeMessages } from "./merge";
export type { MessageTree } from "./merge";

// Re-export framework-agnostic primitives from @tge/locale so existing
// `import { Locale } from "@tge/i18n"` keeps working. New consumers can
// import from @tge/locale directly (API does, because next-intl isn't a
// valid Nest dep).
export {
  locales,
  defaultLocale,
  localeAutonyms,
  localeMetadata,
  isLocale,
  FALLBACK_CHAINS,
  pickLocalized,
  normalizeLocale,
  isLocalizedFilled,
  countFilledLocales,
  parseAcceptLanguage,
  negotiateLocale,
  isCrawlerUA,
  LOCALE_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  type Locale,
  type LocaleDir,
  type LocaleMetadata,
  type LocalizedString,
} from "@tge/locale";
