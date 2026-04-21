"use client";

import type { ReactNode } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";

interface DetailPageShellProps<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  /** Renders the success state once `queryFn` resolves to a truthy payload. */
  render: (data: T) => ReactNode;

  /** Empty-state copy when the fetch resolves but the record is absent. */
  notFoundTitle?: string;
  notFoundDescription?: string;
  notFoundAction?: ReactNode;

  /** Optional override for the loading label. */
  loadingLabel?: string;
  /** Extra react-query options passthrough. */
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Standard detail-page loader. Owns the `loading → error → not-found →
 * success` lifecycle so individual pages stop shipping a pulsing div + `<p>
 * Not found</p>` fallback. Works with any `queryFn` that resolves to the
 * detail payload; pass `notFoundTitle` / `notFoundAction` for per-resource
 * copy.
 */
export function DetailPageShell<T>({
  queryKey,
  queryFn,
  render,
  notFoundTitle,
  notFoundDescription,
  notFoundAction,
  loadingLabel,
  enabled = true,
  staleTime,
}: DetailPageShellProps<T>) {
  const tc = useTranslations("Common");
  const query = useQuery({ queryKey, queryFn, enabled, staleTime });

  if (query.isLoading) {
    return <LoadingState label={loadingLabel ?? tc("loading")} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        onRetry={() => query.refetch()}
        retryLabel={tc("retry")}
      />
    );
  }
  if (!query.data) {
    return (
      <EmptyState
        title={notFoundTitle ?? tc("notFoundTitle")}
        description={notFoundDescription}
        action={notFoundAction}
      />
    );
  }
  return <>{render(query.data)}</>;
}
