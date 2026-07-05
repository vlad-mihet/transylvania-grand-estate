import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import {
  buildLocaleRedirect,
  getLocaleFromPath,
  resolveLocaleForUnprefixed,
} from "@tge/i18n/middleware";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

/**
 * Public marketing site — no auth gate. Same shape as landing's proxy and
 * uses the same pathnames-free routing (locale prefix only, no per-locale
 * URL rewrites).
 *
 * File name + default-export name follow Next 16's `proxy.ts` convention.
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
  matcher: ["/((?!_next/static|_next/image|images|favicon.ico|.*\\..*).*)"],
};
