import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const publicPages = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API routes entirely
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Determine the effective path without locale prefix
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const isLocalePrefixed = routing.locales.includes(firstSegment as (typeof routing.locales)[number]);
  const effectivePath = isLocalePrefixed
    ? "/" + segments.slice(1).join("/") || "/"
    : pathname;

  // Allow public pages without auth
  const isPublicPage = publicPages.some(
    (page) => effectivePath === page || effectivePath.startsWith(page + "/")
  );

  if (isPublicPage) {
    return intlMiddleware(req);
  }

  // Auth check for protected pages
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken || refreshToken.split(".").length !== 3) {
    const locale = isLocalePrefixed ? firstSegment : routing.defaultLocale;
    const loginPath =
      locale === routing.defaultLocale ? "/login" : `/${locale}/login`;
    return NextResponse.redirect(new URL(loginPath, req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
