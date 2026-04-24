import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "@tge/i18n";

/**
 * Academy URL pathnames. Identity mapping for every route; no per-locale
 * path rewrites in v1 (the student surface is narrower than reveria's).
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/login": "/login",
    "/register": "/register",
    "/verify-email": "/verify-email",
    "/resend-verification": "/resend-verification",
    "/forgot-password": "/forgot-password",
    "/reset-password": "/reset-password",
    "/accept-invite": "/accept-invite",
    "/auth/complete": "/auth/complete",
    "/courses/[slug]": "/courses/[slug]",
    "/courses/[slug]/[lessonSlug]": "/courses/[slug]/[lessonSlug]",
    "/catalog": "/catalog",
    "/account": "/account",
  },
});
