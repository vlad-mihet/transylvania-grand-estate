import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import {
  buildLocaleRedirect,
  getLocaleFromPath,
  resolveLocaleForUnprefixed,
} from "@tge/i18n/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Pages that must be reachable without a refreshToken cookie. Anything not
// listed here will be redirected to /login on miss — and that redirect drops
// the query string, so missing entries silently break token-based flows
// (password reset link, invitation acceptance, OAuth callback).
const publicPages = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/auth/complete",
  "/403",
];

/**
 * Edge gate. Order of concerns:
 *
 *  1. **Skip API routes** — Next route handlers under `/api/*` run their own
 *     auth checks (or are intentionally public, e.g. `/api/auth/login`).
 *  2. **Locale detection on unprefixed paths** — with `localePrefix: "always"`,
 *     every URL must carry a locale segment. Unprefixed hits are redirected
 *     using cookie → Accept-Language → default (bots skip to default).
 *  3. **Auth gate** — locale-prefixed paths are checked against the public
 *     allowlist; protected routes need a refreshToken cookie or bounce to
 *     `/{locale}/login?returnTo=...`. Cookie presence is not a security
 *     boundary; the API still verifies the JWT on every authed request. This
 *     middleware just spares users a render cycle of UI they're about to lose.
 *  4. **Pass through** — handoff to next-intl for locale-prefixed rendering.
 *
 * File name + default-export name follow Next 16's `proxy.ts` convention;
 * the legacy `middleware.ts` shape is deprecated and slated for removal.
 */
export default function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Skip API routes entirely.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Unprefixed path → resolve locale and redirect. After the bounce the
  // request re-enters this middleware with a prefix and falls into the
  // auth gate below.
  const pathLocale = getLocaleFromPath(pathname);
  if (!pathLocale) {
    const resolved = resolveLocaleForUnprefixed(req);
    return buildLocaleRedirect(req, resolved);
  }

  // Effective path with the locale segment stripped — used by the public-
  // page allowlist without per-locale entries.
  const effectivePath = pathname.slice(pathLocale.length + 1) || "/";

  const isPublicPage = publicPages.some(
    (page) =>
      effectivePath === page || effectivePath.startsWith(page + "/"),
  );

  if (isPublicPage) {
    return intlMiddleware(req);
  }

  // Auth check. Accept any cookie value that *looks* like a JWT (three
  // dot-separated parts) so a tampered or zeroed cookie can't pretend to be
  // a session — the API will still reject anything forged on the next
  // request, but failing here saves a round-trip.
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken || refreshToken.split(".").length !== 3) {
    const loginUrl = new URL(`/${pathLocale}/login`, req.url);
    if (effectivePath !== "/") {
      loginUrl.searchParams.set("returnTo", `${effectivePath}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(req);
}

export const config = {
  // Skip Next.js internals AND every static-asset path under public/. Without
  // the `images` exclusion, requests for `/images/cities/<slug>.jpg` (synced
  // from @tge/assets at dev/build) hit the auth gate above, fail the
  // refreshToken check (next/image's server-side fetch carries no cookies),
  // and 307 → /login. The browser then sees a redirect chain and gives up
  // on the image. The trailing `\\..*` clause catches future extension-
  // bearing static files (sitemap.xml, robots.txt, *.svg, etc.) so adding a
  // new public/ folder doesn't reproduce the same bug.
  matcher: ["/((?!_next/static|_next/image|images|favicon.ico|.*\\..*).*)"],
};
