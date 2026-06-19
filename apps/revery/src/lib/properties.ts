import { fetchApi, fetchApiSafe } from "@tge/api-client";
import { getBrand } from "@tge/branding";
import type { ApiMapPin, ApiProperty, Locale } from "@tge/types";

// Tier comes from the brand catalogue in @tge/branding. The API also enforces
// this server-side via SiteMiddleware (see apps/api/src/common/site/) — the
// client-side tier param is purely a hint for caches and logs.
export const REVERY_TIER = getBrand().tier;

// Every fetch takes an explicit `locale` and sends it as `?locale=` — the API's
// canonical signal (LocaleMiddleware) for which language to collapse the
// localized Property fields (title/description/…) down to. Without it the API
// falls back to its RO default and all content renders Romanian regardless of
// the UI locale. `locale` is REQUIRED on purpose: a forgotten arg is a compile
// error, not a silent Romanian regression.

export interface PropertyListParams {
  limit?: number;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc";
  citySlug?: string;
  developerId?: string;
  agentId?: string;
  countySlug?: string;
  type?: string;
}

function buildPropertyQuery(
  params: PropertyListParams,
  locale: Locale,
): string {
  const q = new URLSearchParams();
  q.set("tier", REVERY_TIER);
  q.set("locale", locale);
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.sort) q.set("sort", params.sort);
  if (params.citySlug) q.set("city", params.citySlug);
  if (params.developerId) q.set("developerId", params.developerId);
  if (params.agentId) q.set("agentId", params.agentId);
  if (params.countySlug) q.set("county", params.countySlug);
  if (params.type) q.set("type", params.type);
  return q.toString();
}

export function fetchProperties(
  params: PropertyListParams,
  locale: Locale,
): Promise<ApiProperty[]> {
  return fetchApi<ApiProperty[]>(`/properties?${buildPropertyQuery(params, locale)}`);
}

// Fetches only the total number of properties matching the given filters by
// reading `meta.total` off the standard list envelope. Sends `limit=1` so the
// payload stays tiny — we discard the single returned row. Strips UI-only
// params (view/zoom/from/sort) that don't affect count but would bloat the
// cache key.
export async function fetchPropertiesCount(
  filters: URLSearchParams,
  locale: Locale,
): Promise<number> {
  const q = new URLSearchParams(filters);
  q.set("tier", REVERY_TIER);
  q.set("locale", locale);
  q.set("limit", "1");
  q.set("page", "1");
  q.delete("view");
  q.delete("zoom");
  q.delete("from");
  q.delete("sort");
  const res = await fetchApiSafe<ApiProperty[]>(`/properties?${q.toString()}`);
  if (!res.ok) throw res.error;
  const total = res.meta?.total;
  return typeof total === "number" ? total : res.data.length;
}

export function fetchPropertyBySlug(
  slug: string,
  locale: Locale,
): Promise<ApiProperty> {
  return fetchApi<ApiProperty>(`/properties/${slug}?locale=${locale}`);
}

export function fetchPropertyMapPins(
  params: Pick<PropertyListParams, "citySlug" | "countySlug" | "type">,
  locale: Locale,
): Promise<ApiMapPin[]> {
  const q = new URLSearchParams();
  q.set("tier", REVERY_TIER);
  q.set("locale", locale);
  if (params.citySlug) q.set("city", params.citySlug);
  if (params.countySlug) q.set("county", params.countySlug);
  if (params.type) q.set("type", params.type);
  return fetchApi<ApiMapPin[]>(`/properties/map-pins?${q.toString()}`);
}

export function fetchPropertiesByCity(
  citySlug: string,
  locale: Locale,
  limit = 24,
): Promise<ApiProperty[]> {
  return fetchProperties({ citySlug, limit }, locale);
}

export function fetchPropertiesByDeveloper(
  developerId: string,
  locale: Locale,
  limit = 24,
): Promise<ApiProperty[]> {
  return fetchProperties({ developerId, limit }, locale);
}

export function fetchPropertiesByAgent(
  agentId: string,
  locale: Locale,
  limit = 24,
): Promise<ApiProperty[]> {
  return fetchProperties({ agentId, limit }, locale);
}
