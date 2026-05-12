import { NextRequest, NextResponse } from "next/server";
import {
  defaultLocale,
  isCrawlerUA,
  isLocale,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  negotiateLocale,
  type Locale,
} from "@tge/locale";

export type LocaleSource =
  | "url"
  | "cookie"
  | "accept-language"
  | "default"
  | "bot";

export interface ResolvedLocale {
  locale: Locale;
  source: LocaleSource;
}

/** Read the persisted locale choice from the `NEXT_LOCALE` cookie. */
export function getLocaleCookie(req: NextRequest): Locale | null {
  const raw = req.cookies.get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(raw) ? raw : null;
}

/**
 * Write the locale cookie on a response. Called from the switcher (client)
 * and from the initial unprefixed-root detection redirect (server). NOT
 * called on every request — that would tank CDN cache hit rate.
 */
export function setLocaleCookie(res: NextResponse, locale: Locale): void {
  res.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    // Readable from client so the switcher can sync without an extra
    // round-trip. The cookie is a preference signal, not a credential —
    // tampering it just changes the user's own UI.
    httpOnly: false,
  });
}

/**
 * Return the leading locale segment if `pathname` is already locale-prefixed
 * (e.g. `/en/properties` → `"en"`), or `null` otherwise. Used to decide
 * whether to run locale detection or pass through to next-intl.
 */
export function getLocaleFromPath(pathname: string): Locale | null {
  const seg = pathname.split("/")[1];
  return isLocale(seg) ? seg : null;
}

/**
 * Resolve the best locale for an unprefixed request.
 *
 * Precedence:
 *  1. **Bot UA** → default locale, no detection (Google asks crawlers be
 *     served the default and discover other locales via hreflang).
 *  2. **Cookie** (`NEXT_LOCALE`) — user's explicit prior choice.
 *  3. **Accept-Language** — quality-value-aware negotiation against
 *     supported locales.
 *  4. **Default locale** — RO.
 *
 * Use ONLY for unprefixed paths; if the URL already carries a locale prefix,
 * the URL is authoritative — don't call this.
 */
export function resolveLocaleForUnprefixed(req: NextRequest): ResolvedLocale {
  const userAgent = req.headers.get("user-agent");
  if (isCrawlerUA(userAgent)) {
    return { locale: defaultLocale, source: "bot" };
  }

  const cookieLocale = getLocaleCookie(req);
  if (cookieLocale) {
    return { locale: cookieLocale, source: "cookie" };
  }

  const accept = req.headers.get("accept-language");
  if (accept) {
    const negotiated = negotiateLocale(accept, defaultLocale);
    return { locale: negotiated, source: "accept-language" };
  }

  return { locale: defaultLocale, source: "default" };
}

/**
 * Build a redirect from an unprefixed URL to its locale-prefixed equivalent.
 *
 * Cookie is written only on first-detection redirects (source ===
 * "accept-language"); cookie/bot/default redirects don't refresh it.
 *
 * The redirect response itself is `Cache-Control: private, no-store` so it
 * isn't cached by intermediaries — but the destination URL (locale-prefixed)
 * remains freely cacheable, which is the whole point.
 */
export function buildLocaleRedirect(
  req: NextRequest,
  resolved: ResolvedLocale,
  effectivePath: string = req.nextUrl.pathname,
): NextResponse {
  const url = req.nextUrl.clone();
  const cleanPath = effectivePath === "/" ? "" : effectivePath;
  url.pathname = `/${resolved.locale}${cleanPath}`;

  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "private, no-store");

  if (resolved.source === "accept-language") {
    setLocaleCookie(res, resolved.locale);
  }

  return res;
}

/**
 * Convenience matcher: skip Next internals, static images, and any path that
 * looks like a static asset (has a file extension). Apps that need to
 * additionally skip routes (e.g. `/api/*`) should compose their own.
 *
 * Kept here as a reference value — copy it into each app's `config.matcher`
 * rather than importing, because Next requires the matcher to be a literal
 * for build-time analysis.
 */
export const DEFAULT_MIDDLEWARE_MATCHER =
  "/((?!_next/static|_next/image|images|favicon.ico|.*\\..*).*)";
