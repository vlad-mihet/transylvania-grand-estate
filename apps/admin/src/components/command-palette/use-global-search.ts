"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type {
  SearchEntityType,
  SearchResponse,
} from "@tge/types/schemas/search";

/**
 * Debounced query against the global-search endpoint. Caller passes the raw
 * input value and (optionally) an active scope filter; we debounce 250ms,
 * gate at min length 2, and stream the result through React Query.
 *
 * `scope === "all"` (or `null`) sends no `types` param so the API returns
 * every entity the caller's role permits.
 */
export function useGlobalSearch(
  rawQuery: string,
  scope: SearchEntityType | "all",
) {
  const [debounced, setDebounced] = useState(rawQuery.trim());

  useEffect(() => {
    const trimmed = rawQuery.trim();
    if (trimmed === debounced) return;
    const id = setTimeout(() => setDebounced(trimmed), 250);
    return () => clearTimeout(id);
  }, [rawQuery, debounced]);

  const query = useQuery<SearchResponse>({
    queryKey: ["global-search", debounced, scope],
    queryFn: () => {
      const params = new URLSearchParams({
        q: debounced,
        limit: "8",
      });
      if (scope !== "all") params.set("types", scope);
      return apiClient<SearchResponse>(`/search?${params.toString()}`);
    },
    enabled: debounced.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  return {
    debouncedQuery: debounced,
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
  };
}
