import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "@tge/i18n";

// Pathnames-free routing, mirroring the shared TGE/landing config
// (`@tge/i18n/routing`). A `pathnames` map here — even identity entries —
// breaks every 2+-segment route under next-intl@4.8.3 + next@16.1.6: the
// localized-rewrite path only resolves single-segment URLs, so
// `/properties/[slug]`, `/cities/[slug]`, `/blog/[slug]`, and the nested
// `/instrumente/*` tool pages all 404. Dropping the map restores them at the
// cost of the localized tool-URL aliases (/tools · /outils · /werkzeuge) —
// tool pages now use the canonical `/instrumente/*` segment in every locale.
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
});
