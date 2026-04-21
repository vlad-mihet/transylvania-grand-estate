"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";

type Status = "checking" | "ok" | "degraded" | "down" | "unknown";

interface HealthResponse {
  ok?: boolean;
  uptime?: number;
}

/**
 * Live system-status pill for the login page. Hits `/health/live` once on
 * mount with a 12s timeout (Fly cold-starts can reach ~10s) — the endpoint
 * is `@Public()` + skipped from throttling so an unauthenticated browser
 * can probe it cheaply.
 *
 * Kept dependency-free and pre-auth so it renders the same before and after
 * the user has signed in. The pill only goes red for *explicit* 5xx — an
 * AbortError or network failure maps to grey "unknown" rather than alarm
 * red. A status pill that lights up red during normal cold starts would
 * train users to ignore it.
 */
export function AuthStatus() {
  const t = useTranslations("Login");
  // Compute the starting state from the env var so the no-API-URL branch
  // doesn't need a setState-in-effect shortcut.
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const [status, setStatus] = useState<Status>(
    baseUrl ? "checking" : "unknown",
  );

  useEffect(() => {
    if (!baseUrl) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    fetch(`${baseUrl}/health/live`, {
      signal: controller.signal,
      // No credentials — health is public and CORS-open.
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          setStatus(res.status >= 500 ? "down" : "degraded");
          return;
        }
        const data: HealthResponse = await res.json().catch(() => ({}));
        // TransformInterceptor wraps responses in { success, data }; tolerate
        // both shapes so this component doesn't break if the wrapper changes.
        const inner =
          (data as { data?: HealthResponse }).data ?? (data as HealthResponse);
        setStatus(inner?.ok === false ? "degraded" : "ok");
      })
      .catch(() => setStatus("unknown"))
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [baseUrl]);

  const dotClass =
    status === "ok"
      ? "bg-[var(--color-success)]"
      : status === "degraded"
        ? "bg-[var(--color-warning)]"
        : status === "down"
          ? "bg-[var(--color-danger)]"
          : "bg-muted-foreground/50";

  const label =
    status === "checking"
      ? t("statusChecking")
      : status === "ok"
        ? t("statusOk")
        : status === "degraded"
          ? t("statusDegraded")
          : status === "down"
            ? t("statusDown")
            : t("statusUnknown");

  return (
    <div className="mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          dotClass,
          status === "ok" && "animate-pulse",
        )}
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
