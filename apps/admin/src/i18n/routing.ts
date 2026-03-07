import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "@tge/i18n/constants";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});
