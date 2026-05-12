"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  RecentSearchItem,
  RecordSearchHistoryInput,
} from "@tge/types/schemas/search";

const HISTORY_KEY = ["search-history"] as const;

/**
 * Server-backed recent-search list. Surfaces in the palette's empty state so
 * users land on the things they actually use. `limit` defaults to 6 — sized
 * for the empty-state column.
 */
export function useSearchHistory(limit = 6) {
  return useQuery<RecentSearchItem[]>({
    queryKey: [...HISTORY_KEY, limit],
    queryFn: () =>
      apiClient<RecentSearchItem[]>(
        `/search/history?limit=${encodeURIComponent(String(limit))}`,
      ),
    staleTime: 60_000,
  });
}

/**
 * Fire-and-forget mutation that records the user's pick. On success we
 * invalidate the history query so the next palette open shows it.
 */
export function useRecordSearchHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordSearchHistoryInput) =>
      apiClient<void>("/search/history", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

export function useRemoveSearchHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/search/history/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}
