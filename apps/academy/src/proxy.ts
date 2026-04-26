import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Routes allowed without an auth hint cookie. Keep this list tight — every
// entry is a path the middleware will NOT redirect away from when the user
// isn't signed in.
const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/accept-invite",
  "/verify-email",
  "/resend-verification",
  "/forgot-password",
  "/reset-password",
  "/auth/complete",
]);

const AUTH_HINT_COOKIE = "academy_auth";

/**
 * Composite middleware: next-intl handles locale prefix rewriting, then we
 * layer a best-effort auth gate on top. The real tokens live in localStorage
 * (middleware can't read them), so the `academy_auth` hint cookie — set by
 * `setTokens()` and cleared by `clearTokens()` — is the signal. Client-side
 * guards remain the authoritative enforcement; this redirect just spares
 * unauthenticated users a flash of protected UI before they bounce.
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip the locale prefix so the public-path check doesn't need a lookup
  // per-locale. Routing is configured with `localePrefix: 'always'` by
  // default in next-intl, so the first segment is the locale.
  const withoutLocale = stripLocale(pathname);
  const isPublic = PUBLIC_PATHS.has(withoutLocale);

  if (!isPublic && !request.cookies.get(AUTH_HINT_COOKIE)) {
    const loginUrl = request.nextUrl.clone();
    const localePrefix = pathname.slice(0, pathname.length - withoutLocale.length);
    loginUrl.pathname = `${localePrefix || "/ro"}/login`;
    // Preserve the original path (sans locale) as `returnTo` so the login
    // page can route the user back to where they started. The frontend
    // `validateReturnTo` allowlist is the tamper check — this middleware
    // just forwards what the browser asked for.
    const returnTo = `${withoutLocale}${request.nextUrl.search}`;
    loginUrl.search =
      withoutLocale === "/"
        ? ""
        : `?returnTo=${encodeURIComponent(returnTo)}`;
    return NextResponse.redirect(loginUrl);
  }

  return intl(request);
}

function stripLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  const first = segments[0];
  if ((routing.locales as readonly string[]).includes(first)) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
