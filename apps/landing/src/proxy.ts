import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import {
  buildLocaleRedirect,
  getLocaleFromPath,
  resolveLocaleForUnprefixed,
} from "@tge/i18n/middleware";
import { routing } from "@tge/i18n/routing";

const intl = createIntlMiddleware(routing);

/**
 * Public marketing site — no auth gate. Locale resolution job:
 *
 *  - Unprefixed `/` or `/anything` → cookie → Accept-Language → default RO
 *    (bots always get default; they discover other locales via hreflang).
 *  - Locale-prefixed paths (`/en/...`, `/fr/...`) → render as-is. URL beats
 *    cookie; we don't update the cookie when a user clicks a shared link
 *    in a different locale.
 *
 * No `Vary: Accept-Language` or `Vary: Cookie` header — the redirect
 * response is `Cache-Control: private, no-store` (set by
 * `buildLocaleRedirect`), and locale-prefixed responses are deterministic
 * per URL so the CDN can cache them keyed on path alone. Adding a Vary
 * here would tank cache hit rate without correctness benefit.
 *
 * File name + default-export name follow Next 16's `proxy.ts` convention
 * (the old `middleware.ts` shape is deprecated; Next errors out if both
 * files exist).
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const pathLocale = getLocaleFromPath(pathname);
  if (!pathLocale) {
    const resolved = resolveLocaleForUnprefixed(req);
    return buildLocaleRedirect(req, resolved);
  }

  return intl(req);
}

export const config = {
  // Skip Next internals + every static-asset path. Mirrors admin's matcher
  // to keep image-pipeline + sitemap/robots paths off the redirect path.
  matcher: ["/((?!_next/static|_next/image|images|favicon.ico|.*\\..*).*)"],
};
