export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface FetchOptions {
  revalidate?: number;
  tags?: string[];
  headers?: Record<string, string>;
}

export interface MutateOptions {
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  // When true, body is sent as-is (e.g., FormData) and Content-Type is left
  // for the browser to set with the multipart boundary.
  raw?: boolean;
}

/**
 * Auth hook injected by apps that need bearer-token access with refresh.
 * Landing/reveria pass none; admin registers one that reads its in-memory
 * token and hits /api/auth/refresh on 401. Kept as a single global adapter
 * so the token handshake isn't repeated across every call site.
 */
export interface AuthAdapter {
  getAccessToken(): string | null;
  refresh(): Promise<string | null>;
  onAuthFailure(): void;
}

let authAdapter: AuthAdapter | null = null;

export function setAuthAdapter(adapter: AuthAdapter | null): void {
  authAdapter = adapter;
}

export type SafeResult<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: ApiError };

export interface ApiFieldIssue {
  path: string;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly fields?: ApiFieldIssue[];

  constructor(
    status: number,
    message: string,
    path: string,
    fields?: ApiFieldIssue[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    if (fields && fields.length > 0) this.fields = fields;
  }
}

export function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (base) return base;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_URL is required in production but was not set.",
    );
  }
  return "http://localhost:3333/api/v1";
}

// Site identifier sent as `X-Site` on every call. This is the authoritative
// brand signal for server-side (SSR) fetches, where `Origin` is unset. Apps
// declare their site via NEXT_PUBLIC_SITE_ID; the API's SiteMiddleware maps it
// to a tier scope (see apps/api/src/common/site/site.types.ts).
function getSiteId(): string | null {
  return process.env.NEXT_PUBLIC_SITE_ID ?? null;
}

function withSiteHeader(
  headers?: Record<string, string>,
): Record<string, string> | undefined {
  const site = getSiteId();
  if (!site) return headers;
  return { "X-Site": site, ...headers };
}

/**
 * Tag every request with a fresh X-Request-Id so the API's audit log can
 * pivot back to the originating browser/SSR call. The API also accepts an
 * inbound X-Request-Id (see apps/api/src/app.module.ts pino genReqId), so
 * if the caller already set one in `headers` we leave it alone.
 *
 * randomUUID() exists on every modern browser and on Node 18+. We probe
 * globalThis.crypto rather than importing node:crypto so the package stays
 * usable from the browser without a polyfill.
 */
function withRequestId(
  headers?: Record<string, string>,
): Record<string, string> | undefined {
  if (headers && (headers["X-Request-Id"] || headers["x-request-id"])) {
    return headers;
  }
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (!cryptoApi?.randomUUID) return headers;
  return { ...(headers ?? {}), "X-Request-Id": cryptoApi.randomUUID() };
}

function withCorrelationHeaders(
  headers?: Record<string, string>,
): Record<string, string> | undefined {
  return withRequestId(withSiteHeader(headers));
}

function withAuth(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  const token = authAdapter?.getAccessToken();
  if (!token) return headers;
  return { ...headers, Authorization: `Bearer ${token}` };
}

async function fetchWithAuth(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const baseHeaders = (init.headers as Record<string, string>) ?? {};
  const res = await fetch(url, { ...init, headers: withAuth(baseHeaders) });
  if (res.status !== 401 || !authAdapter) return res;

  const newToken = await authAdapter.refresh();
  if (!newToken) {
    authAdapter.onAuthFailure();
    return res;
  }
  return fetch(url, {
    ...init,
    headers: { ...baseHeaders, Authorization: `Bearer ${newToken}` },
  });
}

export async function fetchApi<T>(
  path: string,
  options?: FetchOptions,
): Promise<T> {
  const res = await fetchWithAuth(`${getApiBase()}${path}`, {
    next: { revalidate: options?.revalidate ?? 60, tags: options?.tags },
    headers: withCorrelationHeaders(options?.headers),
  } as RequestInit);
  if (!res.ok) {
    throw new ApiError(res.status, `API error: ${res.status}`, path);
  }
  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
}

export async function fetchApiSafe<T>(
  path: string,
  options?: FetchOptions,
): Promise<SafeResult<T>> {
  try {
    const res = await fetchWithAuth(`${getApiBase()}${path}`, {
      next: { revalidate: options?.revalidate ?? 60, tags: options?.tags },
      headers: withCorrelationHeaders(options?.headers),
    } as RequestInit);
    if (!res.ok) {
      return {
        ok: false,
        error: new ApiError(res.status, `API error: ${res.status}`, path),
      };
    }
    const json = (await res.json()) as ApiResponse<T>;
    return { ok: true, data: json.data, meta: json.meta };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown fetch error";
    return { ok: false, error: new ApiError(0, message, path) };
  }
}

export async function mutateApi<T>(
  path: string,
  options: MutateOptions = {},
): Promise<T> {
  const { method = "POST", body, headers, raw = false } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const shouldSerialize = !raw && !isFormData;
  const baseHeaders = shouldSerialize
    ? { "Content-Type": "application/json", ...headers }
    : { ...headers };
  const res = await fetchWithAuth(`${getApiBase()}${path}`, {
    method,
    headers: withCorrelationHeaders(baseHeaders),
    body: shouldSerialize
      ? body === undefined
        ? undefined
        : JSON.stringify(body)
      : (body as BodyInit | undefined),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => null)) as
      | {
          message?: string;
          error?: {
            message?: string;
            fields?: ApiFieldIssue[];
          };
        }
      | null;
    const message =
      errorJson?.error?.message ??
      errorJson?.message ??
      `API error: ${res.status}`;
    throw new ApiError(res.status, message, path, errorJson?.error?.fields);
  }
  const json = (await res.json()) as ApiResponse<T>;
  // Backwards-compat: some endpoints return unwrapped JSON; fall back to the
  // raw payload when the standard `{ data, meta }` envelope isn't present.
  return (json?.data ?? (json as unknown as T)) as T;
}
