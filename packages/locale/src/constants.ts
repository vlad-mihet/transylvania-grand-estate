export const locales = ["ro", "en", "fr", "de"] as const;
export const defaultLocale = "ro" as const;
export type Locale = (typeof locales)[number];

// Cookie name used to persist the user's explicit locale choice. Read by
// middleware on unprefixed-path redirects; written by the switcher (client)
// and the initial detection redirect (server). Same name on both sides so
// they stay in sync. Matches the de-facto standard `NEXT_LOCALE` used by
// next-i18next / next-intl examples.
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE" as const;
// One year — long enough that a returning user keeps their choice through
// browser-cache resets, short enough that abandoned profiles eventually
// fall back to fresh negotiation.
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Autonyms — each locale rendered in its own language. A user stuck in the
// wrong locale can recognise their target without first having to translate
// the menu (Wikipedia / Google pattern).
export const localeAutonyms = {
  ro: "Română",
  en: "English",
  fr: "Français",
  de: "Deutsch",
} as const satisfies Record<Locale, string>;

export type LocaleDir = "ltr" | "rtl";

export interface LocaleMetadata {
  /** BCP-47 region-qualified tag for Intl APIs and `<html lang>`. */
  readonly bcp47: string;
  /** OpenGraph locale (underscore-separated). */
  readonly og: string;
  /** Writing direction for `<html dir>`. All current locales are ltr;
   *  this field exists so adding Arabic/Hebrew later is a one-field change. */
  readonly dir: LocaleDir;
  /** ISO-4217 currency code most listings in this locale use by default.
   *  Per-row currency on `Property` overrides this when set. */
  readonly defaultCurrency: string;
}

export const localeMetadata = {
  ro: { bcp47: "ro-RO", og: "ro_RO", dir: "ltr", defaultCurrency: "EUR" },
  en: { bcp47: "en-US", og: "en_US", dir: "ltr", defaultCurrency: "EUR" },
  fr: { bcp47: "fr-FR", og: "fr_FR", dir: "ltr", defaultCurrency: "EUR" },
  de: { bcp47: "de-DE", og: "de_DE", dir: "ltr", defaultCurrency: "EUR" },
} as const satisfies Record<Locale, LocaleMetadata>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
