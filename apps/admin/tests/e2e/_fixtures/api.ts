/**
 * Direct NestJS API helpers for cross-app verification. Lets specs assert
 * "this entity is/isn't visible to brand X" without booting the consumer
 * Next.js app. Mirrors the Revery fixture pattern at
 * `apps/revery/tests/e2e/_fixtures/api.ts`.
 *
 * Reads against public endpoints (`/properties`, `/agents`, `/articles`,
 * `/academy/courses`, `/inquiries`) work unauthed when stamped with the
 * right `X-Site` header. Writes the consumer apps would do (e.g. POST
 * /inquiries) are also unauthed.
 *
 * For authenticated admin reads/writes, prefer driving the admin UI in the
 * spec — that's what we're testing anyway. If a spec genuinely needs a raw
 * admin API call (cleanup, etc.), use the `page.request` context which
 * inherits the storageState cookies and goes through the admin BFF.
 */

const API_BASE =
  process.env.ADMIN_API_URL ?? 'http://localhost:4000/api/v1';

export type Brand = 'TGE_LUXURY' | 'REVERY' | 'ACADEMY' | 'ADMIN';

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
};

type Json = Record<string, unknown>;

async function fetchJson<T>(
  path: string,
  init: RequestInit & { brand?: Brand } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.brand && !headers.has('X-Site')) headers.set('X-Site', init.brand);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `API ${init.method ?? 'GET'} ${path} as ${init.brand ?? 'no-brand'} → ` +
        `${res.status}: ${text.slice(0, 300)}`,
    );
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

/** Read a public collection as a given consumer brand. */
export function apiAsBrand<T = unknown>(
  brand: Brand,
  path: string,
  init: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  return fetchJson<ApiEnvelope<T>>(path, { ...init, brand });
}

/** Submit an inquiry as a public consumer (e.g. simulating a Landing form post). */
export function postInquiryAsBrand(
  brand: Brand,
  body: Json,
  opts: { forwardedFor?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Site': brand,
  };
  if (opts.forwardedFor) headers['X-Forwarded-For'] = opts.forwardedFor;
  return fetch(`${API_BASE}/inquiries`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** RFC 5737 TEST-NET-1 IP for throttle isolation. Same helper as Revery. */
export function syntheticIp(seed: string): string {
  const hash = [...seed].reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0,
    0,
  );
  const last = (Math.abs(hash) % 250) + 5;
  return `192.0.2.${last}`;
}

/** Property summary shape returned by GET /properties (subset). */
export type PropertySummary = {
  id: string;
  slug: string;
  title: { en?: string; ro: string; fr?: string; de?: string };
  price: number;
  tier: 'affordable' | 'luxury';
  status?: string;
};

/**
 * Find a property in a brand's visible inventory by exact slug. Returns null
 * when the brand can't see that property (404). Goes through the `/:slug`
 * detail endpoint rather than the list-with-filter — the list query schema
 * strips unknown params silently, so `?slug=` would no-op and return the
 * first row regardless of what we asked for.
 */
export async function findPropertyBySlug(
  brand: Brand,
  slug: string,
): Promise<PropertySummary | null> {
  const headers = new Headers({ 'X-Site': brand });
  const res = await fetch(
    `${API_BASE}/properties/${encodeURIComponent(slug)}`,
    { headers },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `findPropertyBySlug ${slug} as ${brand} → ${res.status}: ${(await res.text()).slice(0, 200)}`,
    );
  }
  const env = (await res.json()) as ApiEnvelope<PropertySummary>;
  return env.data ?? null;
}

/**
 * Find an article visible to real-world consumers of a given brand. Returns
 * null for either (a) the article doesn't exist or (b) it exists but its
 * status isn't `published` — matching what the consumer-side `/blog` list
 * filters for. Note: the raw `/articles/:slug` endpoint does NOT filter by
 * status and returns drafts to all callers; consumer apps avoid that by
 * always going through the list endpoint with `status=published`. This
 * helper preserves consumer-visible semantics.
 */
export async function findArticleBySlug(
  brand: Brand,
  slug: string,
): Promise<{ id: string; slug: string; status?: string } | null> {
  const headers = new Headers({ 'X-Site': brand });
  const res = await fetch(
    `${API_BASE}/articles/${encodeURIComponent(slug)}`,
    { headers },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `findArticleBySlug ${slug} as ${brand} → ${res.status}: ${(await res.text()).slice(0, 200)}`,
    );
  }
  const env = (await res.json()) as ApiEnvelope<{
    id: string;
    slug: string;
    status?: string;
  }>;
  if (env.data?.status !== 'published') return null;
  return env.data;
}

/** A unique-enough suffix for fixture entity names so re-runs don't collide. */
export function uniqueSuffix(prefix = 'qa'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Returns the raw admin access token cached by the `setup` project. Synchronous
 * because the JSON file was written at setup time. Cached in-process so a spec
 * making 20 admin calls only hits disk once.
 *
 * The cached token has a 15-minute JWT lifetime — plenty for any single test
 * run. We deliberately AVOID calling /api/auth/refresh because the API rotates
 * refresh tokens single-use; per-spec refreshes would invalidate each other.
 *
 * Usage:
 *   const token = getAdminAccessToken();
 *   await adminApi(token, '/agents', { method: 'POST', body: {...} });
 */
let cachedAccessToken: string | null = null;

export function getAdminAccessToken(): string {
  if (cachedAccessToken) return cachedAccessToken;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs') as typeof import('node:fs');
  const TOKEN_PATH = './.playwright-storage/admin-tokens.json';
  let raw: string;
  try {
    raw = fs.readFileSync(TOKEN_PATH, 'utf8');
  } catch (err) {
    throw new Error(
      `Could not read admin token file at ${TOKEN_PATH}. ` +
        `Did the setup project run? (${(err as Error).message})`,
    );
  }
  const parsed = JSON.parse(raw) as { accessToken?: string };
  if (!parsed.accessToken) {
    throw new Error(`Token file at ${TOKEN_PATH} is missing accessToken`);
  }
  cachedAccessToken = parsed.accessToken;
  return cachedAccessToken;
}

/**
 * Direct admin-authenticated NestJS API call. Uses `X-Site: ADMIN` so tier-
 * scoping is bypassed (admin can see all tiers). Use this for cleanup and for
 * setting up state that's tedious to click through (creating an agent before
 * a property test that needs an agent assignment, etc.).
 */
export async function adminApi<T = unknown>(
  token: string,
  path: string,
  init: { method?: string; body?: Json } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'X-Site': 'ADMIN',
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `adminApi ${init.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
