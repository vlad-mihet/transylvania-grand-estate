import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildLocaleRedirect,
  getLocaleFromPath,
  resolveLocaleForUnprefixed,
} from "@tge/i18n/middleware";
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

const REFRESH_COOKIE = "academy_refresh";

/**
 * Composite proxy: shared locale resolution → auth gate → next-intl
 * locale-prefix rewriting. The httpOnly `academy_refresh` cookie set by the
 * BFF route handlers is the auth signal — its presence means the session was
 * at least valid at last write. Client-side guards remain the authoritative
 * enforcement; this redirect just spares unauthenticated users a flash of
 * protected UI before they bounce.
 *
 * File name + default-export name follow Next 16's `proxy.ts` convention.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Unprefixed URL → resolve locale (cookie → Accept-Language → default,
  // skipping bots) and redirect to the locale-prefixed equivalent. After
  // the redirect lands the request comes back through this middleware
  // with a prefix and falls into the auth gate below.
  const pathLocale = getLocaleFromPath(pathname);
  if (!pathLocale) {
    const resolved = resolveLocaleForUnprefixed(request);
    return buildLocaleRedirect(request, resolved);
  }

  // Effective path with the locale segment stripped — used to check the
  // public-route allowlist without per-locale entries.
  const withoutLocale = pathname.slice(pathLocale.length + 1) || "/";
  const isPublic = PUBLIC_PATHS.has(withoutLocale);

  if (!isPublic && !request.cookies.get(REFRESH_COOKIE)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${pathLocale}/login`;
    // Preserve the original path (sans locale) as `returnTo` so the login
    // page can route the user back to where they started. The frontend
    // `validateReturnTo` allowlist is the tamper check — this proxy
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

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
