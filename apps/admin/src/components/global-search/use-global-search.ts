"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { SearchResponse } from "@tge/types/schemas/search";

/**
 * Debounced global-search hook. Mirrors the inline-setTimeout debounce used
 * by `SearchInput` (no shared debounce util — single consumer). Queries only
 * fire once the caller's query has been stable for 250ms AND is ≥ 2 chars, so
 * the first one or two keystrokes don't slam the API.
 */
export function useGlobalSearch(rawQuery: string) {
  const [debounced, setDebounced] = useState(rawQuery.trim());

  useEffect(() => {
    const trimmed = rawQuery.trim();
    if (trimmed === debounced) return;
    const id = setTimeout(() => setDebounced(trimmed), 250);
    return () => clearTimeout(id);
  }, [rawQuery, debounced]);

  const query = useQuery<SearchResponse>({
    queryKey: ["global-search", debounced],
    queryFn: () =>
      apiClient<SearchResponse>(
        `/search?q=${encodeURIComponent(debounced)}&limit=5`,
      ),
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
