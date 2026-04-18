import { fetchApi, fetchApiSafe } from "@tge/api-client";
import { getBrand } from "@tge/branding";
import type { ApiMapPin, ApiProperty } from "@tge/types";

// Tier comes from the brand catalogue in @tge/branding. The API also enforces
// this server-side via SiteMiddleware (see apps/api/src/common/site/) — the
// client-side tier param is purely a hint for caches and logs.
export const REVERIA_TIER = getBrand().tier;

export interface PropertyListParams {
  limit?: number;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc";
  citySlug?: string;
  developerId?: string;
  agentId?: string;
  countySlug?: string;
  type?: string;
}

function buildPropertyQuery(params: PropertyListParams): string {
  const q = new URLSearchParams();
  q.set("tier", REVERIA_TIER);
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
  params: PropertyListParams = {},
): Promise<ApiProperty[]> {
  return fetchApi<ApiProperty[]>(`/properties?${buildPropertyQuery(params)}`);
}

// Fetches only the total number of properties matching the given filters by
// reading `meta.total` off the standard list envelope. Sends `limit=1` so the
// payload stays tiny — we discard the single returned row. Strips UI-only
// params (view/zoom/from/sort) that don't affect count but would bloat the
// cache key.
export async function fetchPropertiesCount(
  filters: URLSearchParams,
): Promise<number> {
  const q = new URLSearchParams(filters);
  q.set("tier", REVERIA_TIER);
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

export function fetchPropertyBySlug(slug: string): Promise<ApiProperty> {
  return fetchApi<ApiProperty>(`/properties/${slug}`);
}

export function fetchPropertyMapPins(
  params: Pick<PropertyListParams, "citySlug" | "countySlug" | "type"> = {},
): Promise<ApiMapPin[]> {
  const q = new URLSearchParams();
  q.set("tier", REVERIA_TIER);
  if (params.citySlug) q.set("city", params.citySlug);
  if (params.countySlug) q.set("county", params.countySlug);
  if (params.type) q.set("type", params.type);
  return fetchApi<ApiMapPin[]>(`/properties/map-pins?${q.toString()}`);
}

export function fetchPropertiesByCity(
  citySlug: string,
  limit = 24,
): Promise<ApiProperty[]> {
  return fetchProperties({ citySlug, limit });
}

export function fetchPropertiesByDeveloper(
  developerId: string,
  limit = 24,
): Promise<ApiProperty[]> {
  return fetchProperties({ developerId, limit });
}

export function fetchPropertiesByAgent(
  agentId: string,
  limit = 24,
): Promise<ApiProperty[]> {
  return fetchProperties({ agentId, limit });
}
