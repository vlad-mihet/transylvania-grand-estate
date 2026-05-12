// Re-export from @tge/locale (the framework-agnostic source of truth). This
// shim preserves the `@tge/i18n/constants` import path that existing consumers
// rely on; new code should import directly from @tge/locale (or from @tge/i18n's
// barrel, which re-exports the same names plus the next-intl glue).
export {
  locales,
  defaultLocale,
  localeAutonyms,
  type Locale,
} from "@tge/locale";
