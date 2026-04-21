"use client";

import {
  ApiError,
  mutateApi,
  setAuthAdapter,
  type ApiFieldIssue,
} from "@tge/api-client";

export { ApiError };
export type { ApiFieldIssue };

// In-memory token store. Survives client-side navigation but not full reloads
// by design — the refresh cookie brings the user back in on next call.
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: string };
    accessToken = data.accessToken ?? null;
    return accessToken;
  } catch {
    return null;
  }
}

let adapterInstalled = false;
function ensureAdapter(): void {
  if (adapterInstalled) return;
  adapterInstalled = true;
  setAuthAdapter({
    getAccessToken,
    refresh: refreshAccessToken,
    onAuthFailure: () => {
      accessToken = null;
      if (typeof window !== "undefined") {
        redirectToLogin();
      }
    },
  });
}

/**
 * Session-expired UX. Dynamically imports sonner only in the browser to avoid
 * bundling it into server-rendered routes, and only triggers if we're not
 * already on the login page (prevents a toast loop on refreshes that happen
 * while already logged out).
 */
function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.includes("/login")) return;
  void import("sonner")
    .then(({ toast }) => {
      toast("Session expired", {
        description: "Please sign in again.",
        duration: 4000,
      });
    })
    .finally(() => {
      window.location.href = "/login";
    });
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** GET only. When true, return the full `{ data, meta }` envelope instead
   *  of just `data` — needed when the caller wants `meta.total` for counts
   *  or pagination. */
  envelope?: boolean;
}

/**
 * Admin HTTP entry point. Thin wrapper over `@tge/api-client` so the ~20 admin
 * consumers don't churn. Token refresh and brand routing (X-Site) are handled
 * centrally by the shared client via the AuthAdapter installed on first call.
 */
export async function apiClient<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  ensureAdapter();
  const { method = "GET", body, headers = {}, envelope = false } = options;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (method === "GET") {
    return getRequest<T>(path, headers, envelope);
  }

  return mutateApi<T>(path, {
    method,
    body,
    headers,
    raw: isFormData,
  });
}

async function getRequest<T>(
  path: string,
  extra: Record<string, string>,
  envelope: boolean,
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const url = `${base}${path}`;
  const siteId = process.env.NEXT_PUBLIC_SITE_ID;
  const headers: Record<string, string> = { ...extra };
  if (siteId) headers["X-Site"] = siteId;
  // Mirror the X-Request-Id behaviour shared @tge/api-client uses for
  // mutations so audit rows can correlate with browser network logs even
  // for read-only endpoints (history tab, audit firehose, dashboards).
  if (
    !headers["X-Request-Id"] &&
    !headers["x-request-id"] &&
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    headers["X-Request-Id"] = globalThis.crypto.randomUUID();
  }
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(url, { headers });
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { headers });
    } else if (typeof window !== "undefined") {
      redirectToLogin();
    }
  }
  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; fields?: ApiFieldIssue[] };
    };
    throw new ApiError(
      res.status,
      error.error?.message ?? res.statusText,
      path,
      error.error?.fields,
    );
  }
  const json = (await res.json()) as { data?: T };
  if (envelope) return json as unknown as T;
  return (json.data ?? (json as unknown as T)) as T;
}
