"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: PaginationMeta;
}

export interface UseResourceListOptions {
  /** Query key prefix + default endpoint path. */
  resource: string;
  /** Override the endpoint if the resource key doesn't match the URL. */
  endpoint?: string;
  /** Default page size when not in the URL. */
  defaultLimit?: number;
  /** Default sort value when not in the URL. */
  defaultSort?: string;
  /**
   * Extra query parameters merged into every request. Accepts scalars or
   * arrays (appended repeatedly). Undefined / null / empty-string values are
   * skipped so filter-rail state can pass through directly.
   */
  extraParams?: Record<
    string,
    | string
    | number
    | boolean
    | null
    | undefined
    | ReadonlyArray<string | number>
  >;
  /** Disable fetching (e.g. while required inputs are loading). */
  enabled?: boolean;
}

export interface UseResourceListResult<T> {
  items: T[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: UseQueryResult<unknown>["refetch"];

  search: string;
  setSearch: (q: string) => void;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  sort: string | null;
  setSort: (sort: string) => void;

  selection: ReadonlySet<string>;
  toggleRow: (id: string) => void;
  selectAll: (ids: readonly string[], all: boolean) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

/**
 * Standard list-page state: search, pagination, sort, and row selection, all
 * wired to URL state (except selection, which is local) and TanStack Query.
 * The endpoint is expected to accept `search`, `page`, `limit`, `sort` query
 * params and return either `T[]` or `{ data: T[], meta }`.
 */
export function useResourceList<T>(
  opts: UseResourceListOptions,
): UseResourceListResult<T> {
  const {
    resource,
    endpoint = `/${resource}`,
    defaultLimit = 20,
    defaultSort,
    extraParams,
    enabled = true,
  } = opts;

  const [state, setState] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(defaultLimit),
      sort: parseAsString.withDefault(defaultSort ?? ""),
    },
    { history: "replace", clearOnDefault: true },
  );

  const [selection, setSelection] = useState<Set<string>>(() => new Set());

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (state.q) params.set("search", state.q);
    if (state.page > 1) params.set("page", String(state.page));
    if (state.limit !== defaultLimit) params.set("limit", String(state.limit));
    if (state.sort) params.set("sort", state.sort);
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        if (value === undefined || value === null || value === "") continue;
        if (Array.isArray(value)) {
          if (value.length === 0) continue;
          for (const v of value) params.append(key, String(v));
        } else {
          params.set(key, String(value));
        }
      }
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [state, extraParams, defaultLimit]);

  const query = useQuery({
    queryKey: [resource, queryString],
    queryFn: () =>
      apiClient<PaginatedResponse<T> | T[]>(`${endpoint}${queryString}`),
    placeholderData: keepPreviousData,
    enabled,
  });

  const paginated: PaginatedResponse<T> = useMemo(() => {
    const raw = query.data;
    if (!raw) return { data: [] };
    if (Array.isArray(raw)) return { data: raw };
    return raw;
  }, [query.data]);

  const setPage = useCallback(
    (page: number) => setState({ page }),
    [setState],
  );
  const setSearch = useCallback(
    (q: string) => setState({ q, page: 1 }),
    [setState],
  );
  const setSort = useCallback(
    (sort: string) => setState({ sort, page: 1 }),
    [setState],
  );
  const setLimit = useCallback(
    (limit: number) => setState({ limit, page: 1 }),
    [setState],
  );

  const toggleRow = useCallback((id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: readonly string[], all: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (all) for (const id of ids) next.add(id);
      else for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelection(new Set()), []);

  const isSelected = useCallback(
    (id: string) => selection.has(id),
    [selection],
  );

  return {
    items: paginated.data,
    meta: paginated.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    search: state.q,
    setSearch,
    page: state.page,
    setPage,
    limit: state.limit,
    setLimit,
    sort: state.sort || defaultSort || null,
    setSort,

    selection,
    toggleRow,
    selectAll,
    clearSelection,
    isSelected,
  };
}
