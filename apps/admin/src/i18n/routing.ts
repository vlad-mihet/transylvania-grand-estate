import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "@tge/locale";

// Admin now uses `localePrefix: "always"` so every URL carries an explicit
// locale segment (e.g. `/ro/dashboard`, `/en/properties`). The shared
// middleware helper (`@tge/i18n/middleware`) redirects unprefixed paths to
// the user's preferred locale (cookie → Accept-Language → default RO).
//
// `localeDetection: false` — next-intl's built-in detection is bypassed; the
// shared middleware does this explicitly with bot-aware semantics and
// URL-beats-cookie precedence.
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
});
