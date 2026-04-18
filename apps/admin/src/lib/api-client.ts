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
        window.location.href = "/login";
      }
    },
  });
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
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
  const { method = "GET", body, headers = {} } = options;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (method === "GET") {
    return getRequest<T>(path, headers);
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
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const url = `${base}${path}`;
  const siteId = process.env.NEXT_PUBLIC_SITE_ID;
  const headers: Record<string, string> = { ...extra };
  if (siteId) headers["X-Site"] = siteId;
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(url, { headers });
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { headers });
    } else if (typeof window !== "undefined") {
      window.location.href = "/login";
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
  return (json.data ?? (json as unknown as T)) as T;
}
