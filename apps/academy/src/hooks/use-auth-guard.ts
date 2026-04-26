"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api-client";

/**
 * Client-side auth gate. Replaces the per-page
 * `if (!getAccessToken()) router.replace("/login")` pattern. Captures the
 * current path + query string (sans locale) and stamps it as `returnTo` so
 * the user lands back where they started after login. Returns
 * `isReady: true` once the synchronous token check passes; pages should
 * render their skeleton/loading state until `isReady` flips.
 *
 * Token presence is not a security boundary — the real check happens on
 * the API when queries fire. If the stored token is stale, the central
 * 401 handler in `providers.tsx` redirects with the same `returnTo`.
 */
export function useAuthGuard(): { isReady: boolean } {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      setIsReady(true);
      return;
    }
    const { pathname, search } = window.location;
    const segments = pathname.split("/").filter(Boolean);
    const locale =
      segments[0] && /^[a-z]{2}$/.test(segments[0]) ? segments[0] : "ro";
    // Strip the locale prefix so `returnTo` is a locale-neutral path; the
    // login page re-prefixes the active locale before navigating.
    const pathWithoutLocale =
      segments[0] && /^[a-z]{2}$/.test(segments[0])
        ? "/" + segments.slice(1).join("/")
        : pathname;
    const current = `${pathWithoutLocale}${search}`;
    // Avoid redirect loops if we're already on a public auth page.
    if (
      pathWithoutLocale === "/login" ||
      pathWithoutLocale === "/register" ||
      pathWithoutLocale === "/forgot-password" ||
      pathWithoutLocale === "/reset-password" ||
      pathWithoutLocale === "/verify-email" ||
      pathWithoutLocale === "/resend-verification" ||
      pathWithoutLocale === "/accept-invite" ||
      pathWithoutLocale === "/auth/complete"
    ) {
      setIsReady(true);
      return;
    }
    window.location.replace(
      `/${locale}/login?returnTo=${encodeURIComponent(current)}`,
    );
  }, []);

  return { isReady };
}
