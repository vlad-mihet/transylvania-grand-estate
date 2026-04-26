"use client";

import { Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { setTokens } from "@/lib/api-client";
import { validateReturnTo } from "@/lib/return-to";

/**
 * Google OAuth landing page. The API redirects here with the refresh token
 * and (optionally) a `dest` path in the URL fragment — not the query string
 * — so the token never touches the server logs of this app. We swap the
 * refresh for a fresh pair via /academy/auth/refresh, then route to `dest`
 * if it passes the allowlist in `validateReturnTo`. Anything unrecognized
 * falls through to the dashboard.
 */
function AuthCompleteInner() {
  const router = useRouter();

  useEffect(() => {
    const fragment = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(fragment);
    const rt = params.get("rt");
    const dest = params.get("dest");
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
        const validated = validateReturnTo(dest);
        if (validated) {
          router.replace(validated);
        } else {
          router.replace("/");
        }
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
      <div
        className="inline-flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]"
        aria-busy="true"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>...</span>
      </div>
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
