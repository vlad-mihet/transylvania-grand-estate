const API_BASE = process.env.REVERY_API_URL ?? 'http://localhost:4000/api/v1';

type Json = Record<string, unknown>;

async function api<T = Json>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('X-Site')) headers.set('X-Site', 'REVERY');
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${path} → ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export type ApiEnvelope<T> = { success: boolean; data: T; meta?: Json };

export type PropertySummary = {
  id: string;
  slug: string;
  title: { en: string; ro: string; fr?: string; de?: string };
  price: number;
  tier: 'affordable' | 'luxury';
};

export async function findAffordableSlug(): Promise<string> {
  const env = await api<ApiEnvelope<PropertySummary[]>>('/properties?limit=1', {
    headers: { 'X-Site': 'REVERY' },
  });
  const p = env.data?.[0];
  if (!p?.slug) throw new Error('No affordable property in DB — seed first');
  return p.slug;
}

export async function findLuxurySlug(): Promise<string> {
  const env = await api<ApiEnvelope<PropertySummary[]>>('/properties?limit=1', {
    headers: { 'X-Site': 'TGE_LUXURY' },
  });
  const p = env.data?.[0];
  if (!p?.slug) throw new Error('No luxury property in DB — seed first');
  return p.slug;
}

export async function findCitySlug(): Promise<string> {
  const env = await api<ApiEnvelope<{ slug: string }[]>>('/cities?limit=1');
  const c = env.data?.[0];
  if (!c?.slug) throw new Error('No city in DB');
  return c.slug;
}

export async function findAgentSlug(): Promise<string> {
  const env = await api<ApiEnvelope<{ slug: string }[]>>('/agents?active=true&limit=1');
  const a = env.data?.[0];
  if (!a?.slug) throw new Error('No active agent in DB');
  return a.slug;
}

export async function findDeveloperSlug(): Promise<string> {
  const env = await api<ApiEnvelope<{ slug: string }[]>>('/developers?limit=1');
  const d = env.data?.[0];
  if (!d?.slug) throw new Error('No developer in DB');
  return d.slug;
}

export async function findArticleSlug(): Promise<string> {
  const env = await api<ApiEnvelope<{ slug: string }[]>>(
    '/articles?status=published&limit=1',
  );
  const ar = env.data?.[0];
  if (!ar?.slug) throw new Error('No published article in DB');
  return ar.slug;
}

export async function postInquiry(
  body: Json,
  opts: { forwardedFor?: string } = {},
): Promise<Response> {
  // The API throttles POST /inquiries at 5/min per X-Forwarded-For. Tests can
  // pass a synthetic IP so they don't share a bucket with other concurrent
  // tests (rate-limit.spec.ts deliberately exhausts its own bucket).
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Site': 'REVERY',
  };
  if (opts.forwardedFor) headers['X-Forwarded-For'] = opts.forwardedFor;
  return fetch(`${API_BASE}/inquiries`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** Synthetic 192.0.2.0/24 (RFC 5737 TEST-NET-1). Safe to use for throttle isolation. */
export function syntheticIp(seed: string): string {
  const hash = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0);
  const last = Math.abs(hash) % 250 + 5;
  return `192.0.2.${last}`;
}
