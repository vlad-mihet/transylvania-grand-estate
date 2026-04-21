"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Button, Checkbox, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@tge/ui";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import { cn } from "@tge/utils";
import { Mono } from "@/components/shared/mono";
import { SkeletonRows } from "@/components/shared/skeleton-rows";
import type { PaginationMeta } from "@/hooks/use-resource-list";

export { type ColumnDef } from "@tanstack/react-table";

export interface ResourceTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Total rows on the server — drives pagination labels. */
  meta?: PaginationMeta;
  page: number;
  onPageChange: (page: number) => void;
  limit: number;
  onLimitChange?: (limit: number) => void;

  /** Server-side sorting. `sort` is the current value (e.g. "price_desc"). */
  sort?: string | null;
  onSortChange?: (sort: string) => void;
  /** Mapping of column id → { asc, desc } sort tokens. Absent column = not sortable. */
  sortTokens?: Record<string, { asc: string; desc: string }>;

  /** Row selection (optional — omit to disable the checkbox column). */
  selection?: ReadonlySet<string>;
  onToggleRow?: (id: string) => void;
  onSelectAll?: (ids: readonly string[], all: boolean) => void;
  rowId?: (row: T) => string;

  /** Slots for empty / error / loading presentations rendered inside the table shell. */
  isLoading?: boolean;
  isError?: boolean;
  emptySlot?: ReactNode;
  errorSlot?: ReactNode;
  loadingSlot?: ReactNode;

  /** Click handler for a row (row-level navigation). */
  onRowClick?: (row: T) => void;

  /** Optional mobile card renderer (falls back to table on narrow screens). */
  mobileCard?: (row: T) => React.ReactNode;

  className?: string;
}

/**
 * Server-driven workbench table. Expects pagination / sort / search state to
 * live in the parent (typically `useResourceList`) — this component is
 * display-only for data rows + selection.
 */
export function ResourceTable<T>({
  columns,
  data,
  meta,
  page,
  onPageChange,
  limit,
  sort,
  onSortChange,
  sortTokens,
  selection,
  onToggleRow,
  onSelectAll,
  rowId = (row: T) => (row as unknown as { id: string }).id,
  isLoading,
  isError,
  emptySlot,
  errorSlot,
  loadingSlot,
  onRowClick,
  mobileCard,
  className,
}: ResourceTableProps<T>) {
  const t = useTranslations("Common");

  const hasSelection = !!(selection && onToggleRow);

  const allColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!hasSelection) return columns;
    const ids = data.map(rowId);
    const allSelected =
      ids.length > 0 && ids.every((id) => selection!.has(id));
    const someSelected =
      !allSelected && ids.some((id) => selection!.has(id));

    const selectColumn: ColumnDef<T, unknown> = {
      id: "__select",
      enableSorting: false,
      size: 36,
      header: () => (
        <Checkbox
          aria-label="Select all rows"
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => onSelectAll?.(ids, !!checked)}
        />
      ),
      cell: ({ row }) => {
        const id = rowId(row.original);
        return (
          <Checkbox
            aria-label="Select row"
            checked={selection!.has(id)}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={() => onToggleRow!(id)}
          />
        );
      },
    };
    return [selectColumn, ...columns];
  }, [columns, hasSelection, data, rowId, selection, onSelectAll, onToggleRow]);

  const sortingState: SortingState = useMemo(() => {
    if (!sort || !sortTokens) return [];
    for (const [colId, tokens] of Object.entries(sortTokens)) {
      if (tokens.asc === sort) return [{ id: colId, desc: false }];
      if (tokens.desc === sort) return [{ id: colId, desc: true }];
    }
    return [];
  }, [sort, sortTokens]);

  const table = useReactTable({
    data,
    columns: allColumns,
    manualPagination: true,
    manualSorting: true,
    state: { sorting: sortingState },
    pageCount: meta?.totalPages ?? -1,
    getCoreRowModel: getCoreRowModel(),
  });

  const total = meta?.total ?? data.length;
  const totalPages = meta?.totalPages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  const showMobileState = isError || isLoading || data.length === 0;

  return (
    <div className={cn("space-y-3", className)}>
      {mobileCard && (
        <div className="md:hidden">
          {showMobileState ? (
            <div className="rounded-md border border-border bg-card">
              {isError
                ? errorSlot
                : isLoading
                  ? loadingSlot
                  : emptySlot}
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((row) => (
                <div key={rowId(row)}>{mobileCard(row)}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={mobileCard ? "hidden md:block" : undefined}>
        <div className="overflow-clip rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const columnId = header.column.id;
                    const sortable = !!sortTokens?.[columnId] && !!onSortChange;
                    const current =
                      sortable && sortTokens![columnId].asc === sort
                        ? "asc"
                        : sortable && sortTokens![columnId].desc === sort
                          ? "desc"
                          : null;

                    const handleSort = () => {
                      if (!sortable || !onSortChange) return;
                      const { asc, desc } = sortTokens![columnId];
                      onSortChange(current === "asc" ? desc : asc);
                    };

                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className="sticky top-0 z-10 bg-muted"
                      >
                        {header.isPlaceholder ? null : sortable ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-left transition-colors hover:text-foreground"
                            onClick={handleSort}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {current === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : current === "desc" ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40" />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={allColumns.length} className="p-0">
                    {errorSlot}
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <SkeletonRows columns={allColumns.length} />
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={allColumns.length} className="p-0">
                    {emptySlot}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const id = rowId(row.original);
                  const selected = selection?.has(id);
                  return (
                    <TableRow
                      key={row.id}
                      data-state={selected ? "selected" : undefined}
                      className={cn(
                        onRowClick && "cursor-pointer",
                        selected && "bg-[color-mix(in_srgb,var(--color-copper)_6%,transparent)]",
                      )}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {(total > 0 || totalPages > 1) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
          <Mono className="text-muted-foreground">
            {total === 0
              ? t("noResults")
              : t("rangeOf", { from, to, total })}
          </Mono>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Mono className="min-w-[4.5rem] text-center text-muted-foreground">
              {t("page", { current: page, total: totalPages })}
            </Mono>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
