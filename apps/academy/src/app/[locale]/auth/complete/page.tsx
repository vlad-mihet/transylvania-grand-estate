"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { setAccessToken } from "@/lib/api-client";
import { qk } from "@/hooks/query-keys";
import { validateReturnTo } from "@/lib/return-to";
import type { Profile } from "@/hooks/queries";

/**
 * Google OAuth landing page. The API redirects here with the refresh token
 * and (optionally) a `dest` path in the URL fragment — not the query string
 * — so the token never touches the server logs of this app. We hand the
 * token to the local BFF route at `/api/auth/complete`, which exchanges it
 * upstream (rotating the jti) and lands the new refresh token as the
 * httpOnly `academy_refresh` cookie. Anything that fails the returnTo
 * allowlist falls through to the dashboard.
 */
function AuthCompleteInner() {
  const router = useRouter();
  const qc = useQueryClient();

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

    fetch("/api/auth/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`complete failed: ${res.status}`);
        return (await res.json()) as { accessToken: string; user: Profile };
      })
      .then((data) => {
        if (!data?.accessToken) throw new Error("no access token in response");
        setAccessToken(data.accessToken);
        qc.setQueryData(qk.me(), data.user);
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
  }, [router, qc]);

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
  return <AuthCompleteInner />;
}
