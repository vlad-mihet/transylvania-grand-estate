import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@tge/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const response = intlMiddleware(req);
  response.headers.append("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
