"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  SearchCountsResponse,
  SearchEntityType,
} from "@tge/types/schemas/search";

/**
 * Total entity counts for the palette's filter rail (the always-visible
 * "1,234 properties" badges). Distinct from per-query result counts — those
 * come from `/search` and only exist while the user is typing.
 *
 * Cached aggressively: counts in this admin barely change minute-to-minute,
 * and the rail is fine showing values a few minutes stale. `enabled` is
 * gated on the palette being open so we don't burn requests for users who
 * never invoke ⌘K.
 */
export function useEntityCounts(enabled: boolean) {
  const query = useQuery<SearchCountsResponse>({
    queryKey: ["search-counts"],
    queryFn: () => apiClient<SearchCountsResponse>("/search/counts"),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  /** Pivot the wire array into a quick lookup map for rail rendering. */
  const countsByEntity = useMemo<Partial<Record<SearchEntityType, number>>>(() => {
    const map: Partial<Record<SearchEntityType, number>> = {};
    for (const { entity, count } of query.data?.counts ?? []) {
      map[entity] = count;
    }
    return map;
  }, [query.data]);

  const totalCount = useMemo(
    () =>
      (query.data?.counts ?? []).reduce((sum, c) => sum + c.count, 0),
    [query.data],
  );

  return {
    countsByEntity,
    totalCount,
    isLoading: query.isLoading,
  };
}
