/**
 * Academy API client. Thin fetch wrapper that stamps every request with
 * `X-Site: ACADEMY` + the student's Bearer token when one is stored in
 * `localStorage`. Matches the auth-and-site-routing pattern used by the
 * admin app, scoped to the academy realm.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";
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
  const data = await res.json();
  if (data?.accessToken && data?.refreshToken) {
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
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
  // Nest's TransformInterceptor wraps all responses as `{ data, meta? }`.
  // Caller gets the unwrapped `data` payload; see apps/api/src/common/
  // interceptors/transform.interceptor.ts.
  const json = await res.json();
  return (json?.data ?? json) as T;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
