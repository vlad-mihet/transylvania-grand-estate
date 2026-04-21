"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

/**
 * Landing page for the Google OAuth handoff. The API callback redirects
 * here with the refresh token in the URL fragment — fragments stay client-
 * side (never hit server logs) which is important given the token is a
 * long-lived credential.
 *
 * Flow:
 *   1. Parse `#rt=...&dest=...` from location.hash.
 *   2. POST { refreshToken } to `/api/auth/complete` so the server can set
 *      it as an httpOnly cookie on the admin origin.
 *   3. Hard-navigate to `dest` — a full reload lets the dashboard layout
 *      re-mount AuthProvider, which re-hydrates from the refresh cookie.
 */
export default function AuthCompletePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = typeof window !== "undefined"
      ? window.location.hash.replace(/^#/, "")
      : "";
    const params = new URLSearchParams(hash);
    const refreshToken = params.get("rt");
    const dest = params.get("dest") ?? "/";

    // Strip the fragment before any network call. The refresh token is a
    // long-lived credential; leaving it in `location.hash` means it sits in
    // browser history and is visible to any JS that reads `location`. The
    // fragment stays out of server logs by nature, but we can also keep it
    // out of history with a single replaceState.
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }

    if (!refreshToken) {
      setError("missing_token");
      return;
    }

    fetch("/api/auth/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("cookie_set_failed");
        window.location.href = dest;
      })
      .catch(() => setError("cookie_set_failed"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        {error ? (
          <>
            <AlertCircle className="h-6 w-6 text-[var(--color-warning)]" />
            <p>Sign-in handoff failed. Returning to login\u2026</p>
            <a
              href="/login"
              className="underline hover:text-foreground"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/login?error=oauth_handoff";
                }
              }}
            >
              Go to login
            </a>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Signing you in\u2026</p>
          </>
        )}
      </div>
    </main>
  );
}
