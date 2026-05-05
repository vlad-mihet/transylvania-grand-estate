/**
 * Academy API client. Thin fetch wrapper that stamps every request with
 * `X-Site: ACADEMY` + the student's Bearer token when one is stored in
 * `localStorage`. Matches the auth-and-site-routing pattern used by the
 * admin app, scoped to the academy realm.
 */

// Empty string and undefined both count as "unset" — `??` alone would let an
// empty build-arg through, which collapses `${API_URL}${path}` to a relative
// URL at runtime and 404s against the academy's own origin. In production we
// throw on first call so misbuilds fail loudly instead of silently. Mirrors
// packages/api-client/src/client.ts getApiBase().
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

const ACCESS_TOKEN_KEY = "academy.accessToken";
const REFRESH_TOKEN_KEY = "academy.refreshToken";
// Non-HTTPOnly "I am logged in" hint cookie. The real tokens still live
// in localStorage (middleware can't read those); this cookie lets the
// Next.js middleware short-circuit to /login on protected routes without
// a full client-side bounce. NOT a security boundary — client-side guards
// remain authoritative. Migrating to HTTPOnly refresh cookies is a
// separate hardening pass.
const AUTH_HINT_COOKIE = "academy_auth";
const AUTH_HINT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function setAuthHintCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_HINT_COOKIE}=1; path=/; max-age=${AUTH_HINT_MAX_AGE_SECONDS}; samesite=lax`;
}

function clearAuthHintCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_HINT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  setAuthHintCookie();
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearAuthHintCookie();
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  locale?: string;
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/academy/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Site": SITE,
    },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  // Nest's TransformInterceptor wraps the handler return as
  // `{ success, data: { accessToken, refreshToken, user } }`. Read through
  // `json.data` (with a raw fallback) — the previous direct-read of
  // `json.accessToken` always returned undefined, so refresh silently
  // failed and the next 401 logged the user out, masquerading as a
  // "have-to-log-in-after-every-deploy" symptom.
  const json = await res.json();
  const payload = json?.data ?? json;
  if (payload?.accessToken && payload?.refreshToken) {
    setTokens({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    });
    return true;
  }
  return false;
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
    const ok = await refreshTokens();
    if (ok) {
      const retryHeaders = { ...headers };
      const token = getAccessToken();
      if (token) retryHeaders.Authorization = `Bearer ${token}`;
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
