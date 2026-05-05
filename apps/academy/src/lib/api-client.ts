/**
 * Academy API client. Thin fetch wrapper that stamps every request with
 * `X-Site: ACADEMY` + the student's Bearer token from an in-memory store.
 *
 * Tokens were previously held in localStorage with a non-httpOnly hint
 * cookie. They now live in:
 *   - In-memory access token (this module) — survives SPA navigation, lost
 *     on full page reload. Restored via `/api/auth/refresh` on mount.
 *   - HttpOnly `academy_refresh` cookie set by the Next route handlers under
 *     `/api/auth/*`. JS can't read it, so XSS can no longer lift the session.
 *
 * Mutations that change the cookie (login, register, refresh, logout,
 * verify-email, accept-invite, complete) go through Next route handlers;
 * read-only mutations (forgot-password, reset-password, resend-verification)
 * still go straight to the API since they don't touch the session cookie.
 */

import { useSyncExternalStore } from "react";

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL;
const API_URL =
  RAW_API_URL && RAW_API_URL.length > 0
    ? RAW_API_URL
    : process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error(
            "NEXT_PUBLIC_API_URL must be set for production builds",
          );
        })()
      : "http://localhost:4000/api/v1";
const SITE = process.env.NEXT_PUBLIC_SITE ?? "ACADEMY";

/* ───── In-memory access token with pub/sub ───── */

let accessTokenValue: string | null = null;
const subscribers = new Set<() => void>();

export function setAccessToken(token: string | null): void {
  accessTokenValue = token;
  subscribers.forEach((fn) => fn());
}

export function getAccessToken(): string | null {
  return accessTokenValue;
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/**
 * React hook for reactively reading the access token. Use this in `useQuery`
 * `enabled` predicates and any UI that needs to re-render when the token
 * appears (post-restore) or disappears (post-logout).
 */
export function useAccessToken(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => accessTokenValue,
    () => null,
  );
}

/* ───── Refresh-on-401 with dedup lock ─────
 *
 * The Next /api/auth/refresh handler reads the httpOnly cookie and proxies
 * to the upstream, which enforces single-use rotation (jti denylist). React
 * StrictMode mounts components twice in dev; without this lock both effects
 * fire `restore()` in parallel, the first rotates the jti, the second sees
 * the revoked jti and 401s — kicking the user out. Sharing the in-flight
 * promise across mounts collapses the race to one network call.
 */
let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;
  inflightRefresh = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) {
        setAccessToken(null);
        return null;
      }
      const data = (await res.json()) as { accessToken?: string };
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      // Release on next tick so a quick StrictMode remount hits the cached
      // promise but a genuine later refresh issues a fresh call.
      setTimeout(() => {
        inflightRefresh = null;
      }, 0);
    }
  })();
  return inflightRefresh;
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  locale?: string;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Site": SITE,
    ...(options.headers ?? {}),
  };
  if (options.locale) headers["Accept-Language"] = options.locale;
  if (!options.skipAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  let res = await fetch(url, init);
  if (res.status === 401 && !options.skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { ...init, headers: retryHeaders });
    } else {
      throw new ApiError("Unauthorized", 401);
    }
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const json = await res.json();
      if (json?.message) message = Array.isArray(json.message) ? json.message.join(", ") : json.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  // Nest's TransformInterceptor wraps responses as `{ success, data, meta? }`.
  // Non-paginated calls want just `data`. Paginated calls (catalog, lessons)
  // expect `{ data, meta }` — the controller returns that shape, the
  // interceptor flattens it onto the envelope, so we reassemble it here when
  // `meta` is present. See apps/api/src/common/interceptors/transform.interceptor.ts.
  const json = await res.json();
  if (
    json &&
    typeof json === "object" &&
    "meta" in json &&
    "data" in json
  ) {
    return { data: json.data, meta: json.meta } as T;
  }
  return (json?.data ?? json) as T;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
