"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { setTokens } from "@/lib/api-client";

/**
 * Google OAuth landing page. The API redirects here with the refresh token
 * and (optionally) a `dest` path in the URL fragment — not the query string
 * — so the token never touches the server logs of this app. We swap the
 * refresh for a fresh pair via /academy/auth/refresh, then route to `dest`.
 */
function AuthCompleteInner() {
  const router = useRouter();

  useEffect(() => {
    const fragment = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(fragment);
    const rt = params.get("rt");
    // `dest` is ignored in v1 — the typed router only accepts declared
    // pathnames, and the academy app has a single post-login home (`/`).
    // If deep-linking to an invited lesson comes up later, add a path
    // allowlist or switch to a `next-intl` dynamic route.
    if (!rt) {
      router.replace({ pathname: "/login", query: { error: "missing_token" } });
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";
    fetch(`${apiUrl}/academy/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Site": "ACADEMY" },
      body: JSON.stringify({ refreshToken: rt }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`refresh failed: ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        const data = payload?.data ?? payload;
        if (!data?.accessToken) throw new Error("no access token in refresh response");
        setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? rt,
        });
        // `dest` is a raw path from the API fragment; the typed router
        // doesn't accept arbitrary strings, so we fall back to `/` when it
        // doesn't match a declared pathname. Good-enough for v1; a follow-up
        // could add a path allowlist or use window.location for full URLs.
        router.replace("/");
      })
      .catch(() => {
        router.replace({
          pathname: "/login",
          query: { error: "refresh_failed" },
        });
      });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <p className="text-sm text-[color:var(--color-muted-foreground)]">...</p>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <AuthCompleteInner />
    </Suspense>
  );
}
