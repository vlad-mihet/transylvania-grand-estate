import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@tge/api-client";
import type { ApiProperty } from "@tge/types";

export interface UsePropertiesParams {
  tier?: "luxury" | "affordable";
  city?: string;
  county?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  developerId?: string;
  agentId?: string;
  featured?: boolean;
  sort?: "price_asc" | "price_desc" | "newest" | "oldest";
  search?: string;
  page?: number;
  limit?: number;
}

function buildPropertyQuery(params: UsePropertiesParams): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    q.set(key, String(value));
  }
  return q.toString();
}

/**
 * Client-side properties query — listing pages use this for filter-driven
 * updates. Server components still prefetch via `fetchApi` directly (into a
 * `HydrationBoundary`). The API enforces tier scope server-side via
 * `SiteMiddleware`, so `params.tier` is a cache-key hint only.
 */
export function useProperties(params: UsePropertiesParams = {}) {
  return useQuery({
    queryKey: ["properties", params],
    queryFn: () =>
      fetchApi<ApiProperty[]>(
        `/properties${
          Object.keys(params).length ? `?${buildPropertyQuery(params)}` : ""
        }`,
      ),
    staleTime: 60_000,
  });
}
