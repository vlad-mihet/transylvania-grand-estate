import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Academy middleware only handles i18n routing right now. JWT presence is
// checked client-side (token lives in localStorage) and server-side inside
// the page via the API proxy. Adding a cookie-based auth check here would
// force migrating token storage — leave for a follow-up.
export default createMiddleware(routing);

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
