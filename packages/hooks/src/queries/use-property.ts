import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@tge/api-client";
import type { ApiProperty } from "@tge/types";

/**
 * Single-property query. `locale` is part of the cache key so concurrent
 * locale switches don't poison the cache once PR 4b collapses responses
 * on the wire.
 */
export function useProperty(locale: string, slug: string | null) {
  return useQuery({
    queryKey: ["property", locale, slug],
    queryFn: () => fetchApi<ApiProperty>(`/properties/${slug}`),
    enabled: !!slug,
    staleTime: 60_000,
  });
}
