import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "./constants";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
