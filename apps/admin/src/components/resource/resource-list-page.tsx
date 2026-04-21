"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@tge/ui";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Mono } from "@/components/shared/mono";
import {
  ResourceTable,
  type ColumnDef,
} from "@/components/resource/resource-table";
import type { UseResourceListResult } from "@/hooks/use-resource-list";

interface ResourceListPageProps<T> {
  title: string;
  description?: string;
  createHref?: string;
  createLabel?: string;
  headerActions?: ReactNode;

  /** Result of `useResourceList<T>()`. */
  list: UseResourceListResult<T>;

  columns: ColumnDef<T, unknown>[];
  rowId?: (row: T) => string;
  onRowClick?: (row: T) => void;

  /** Left filter rail (typically a <FilterRail>) — hidden on small screens. */
  filterRail?: ReactNode;
  /** Count of active filters, shown on the toggle button. */
  activeFilters?: number;

  /** Bulk-action bar rendered above the table when rows are selected. */
  bulkActions?: (selection: ReadonlySet<string>) => ReactNode;

  /** Sort options surfaced in a sort dropdown above the table. */
  sortOptions?: Array<{ value: string; label: string }>;
  /** Sort tokens per sortable column id (for header click sorting). */
  sortTokens?: Record<string, { asc: string; desc: string }>;

  /** Empty state overrides. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;

  mobileCard?: (row: T) => ReactNode;
  searchPlaceholder?: string;
}

/**
 * Workbench list-page primitive. Composes header + sub-header (search,
 * filters, sort, bulk actions) + optional filter rail + ResourceTable.
 * Intended entry point for every resource under `(dashboard)`.
 */
export function ResourceListPage<T>({
  title,
  description,
  createHref,
  createLabel,
  headerActions,
  list,
  columns,
  rowId,
  onRowClick,
  filterRail,
  activeFilters = 0,
  bulkActions,
  sortOptions,
  sortTokens,
  emptyTitle,
  emptyDescription,
  emptyAction,
  mobileCard,
  searchPlaceholder,
}: ResourceListPageProps<T>) {
  const t = useTranslations("Common");
  const [railOpen, setRailOpen] = useState(true);
  const hasFilterRail = !!filterRail;
  const selectedCount = list.selection.size;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title={title}
        description={
          description ??
          (list.meta
            ? `${list.meta.total} ${list.meta.total === 1 ? "item" : "items"}`
            : undefined)
        }
        createHref={createHref}
        createLabel={createLabel}
        actions={headerActions}
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {hasFilterRail && railOpen && (
          <div className="hidden lg:block">{filterRail}</div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Sub-header: search + filter toggle + sort. */}
          <div className="flex flex-wrap items-center gap-2">
            {hasFilterRail && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRailOpen((v) => !v)}
                className="hidden lg:inline-flex"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">
                  Filters
                  {activeFilters > 0 && (
                    <span className="ml-1.5 mono text-[11px] text-copper">
                      {activeFilters}
                    </span>
                  )}
                </span>
              </Button>
            )}
            <SearchInput
              value={list.search}
              onValueChange={list.setSearch}
              placeholder={searchPlaceholder ?? t("searchPlaceholder")}
              shortcut="⌘K"
            />
            {sortOptions && sortOptions.length > 0 && (
              <select
                value={list.sort ?? ""}
                onChange={(e) => list.setSort(e.target.value)}
                className="mono h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Bulk action bar. */}
          {bulkActions && selectedCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-[color-mix(in_srgb,var(--color-copper)_5%,transparent)] px-3 py-2">
              <Mono className="text-foreground">
                {selectedCount} selected
              </Mono>
              <div className="flex items-center gap-2">
                {bulkActions(list.selection)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={list.clearSelection}
                  className="text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          )}

          <ResourceTable
            data={list.items}
            columns={columns}
            meta={list.meta}
            page={list.page}
            onPageChange={list.setPage}
            limit={list.limit}
            onLimitChange={list.setLimit}
            sort={list.sort}
            onSortChange={list.setSort}
            sortTokens={sortTokens}
            selection={bulkActions ? list.selection : undefined}
            onToggleRow={bulkActions ? list.toggleRow : undefined}
            onSelectAll={bulkActions ? list.selectAll : undefined}
            rowId={rowId}
            onRowClick={onRowClick}
            isLoading={list.isLoading}
            isError={list.isError}
            mobileCard={mobileCard}
            loadingSlot={<LoadingState label={t("loading")} />}
            errorSlot={
              <ErrorState
                onRetry={() => list.refetch()}
                retryLabel={t("retry")}
              />
            }
            emptySlot={
              <EmptyState
                title={emptyTitle ?? t("emptyTitle")}
                description={
                  list.search
                    ? t("emptySearchDescription", { query: list.search })
                    : emptyDescription
                }
                action={emptyAction}
                className={cn("m-4")}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
