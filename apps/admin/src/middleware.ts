import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
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
 * Edge auth gate. Sits in front of next-intl's locale rewriting so an
 * unauthenticated hit on a protected route is bounced to /login *before*
 * SSR runs — that's what kills the brief "flash of authenticated chrome"
 * that pure client-side guards leave behind.
 *
 * Cookie presence is not a security boundary; the API still verifies the
 * JWT on every authed request. This middleware just spares users a render
 * cycle of UI they're about to lose. The `returnTo` query is preserved so
 * the post-login bounce drops them where they started.
 */
export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Skip API routes entirely — Next route handlers under /api/* run their
  // own auth checks (or are intentionally public, e.g. /api/auth/login).
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Determine the effective path without locale prefix.
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const isLocalePrefixed = routing.locales.includes(
    firstSegment as (typeof routing.locales)[number],
  );
  const effectivePath = isLocalePrefixed
    ? "/" + segments.slice(1).join("/") || "/"
    : pathname;

  // Allow public pages without auth.
  const isPublicPage = publicPages.some(
    (page) => effectivePath === page || effectivePath.startsWith(page + "/"),
  );

  if (isPublicPage) {
    return intlMiddleware(req);
  }

  // Auth check for protected pages. We accept any cookie value that *looks*
  // like a JWT (three dot-separated parts) so a tampered or zeroed cookie
  // can't pretend to be a session — the API will still reject anything
  // forged on the next request, but failing here saves a round-trip.
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken || refreshToken.split(".").length !== 3) {
    const locale = isLocalePrefixed ? firstSegment : routing.defaultLocale;
    const loginPath =
      locale === routing.defaultLocale ? "/login" : `/${locale}/login`;
    const loginUrl = new URL(loginPath, req.url);
    // Preserve the original path + search as `returnTo` so the post-login
    // bounce returns the user to where they tried to go. The login page's
    // `validateReturnTo` allowlist is the tamper check; we just forward
    // what the browser asked for.
    if (effectivePath !== "/") {
      loginUrl.searchParams.set("returnTo", `${effectivePath}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
