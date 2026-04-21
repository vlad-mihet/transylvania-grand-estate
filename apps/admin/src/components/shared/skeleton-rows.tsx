"use client";

import { TableCell, TableRow } from "@tge/ui";

interface SkeletonRowsProps {
  /** Number of columns in the parent table (matches `colSpan` expectations). */
  columns: number;
  /** How many skeleton rows to render. Default 8 keeps perceived responsiveness. */
  rows?: number;
  /**
   * Optional per-column bar widths (CSS length — e.g. `"60%"`, `"120px"`).
   * Falls back to an alternating pattern that reads "natural".
   */
  widths?: string[];
}

const DEFAULT_WIDTHS = ["70%", "60%", "80%", "50%", "65%", "45%"];

/**
 * Shimmer rows used while a ResourceTable is loading. Matches the real row
 * height (36 px via the table header CSS) so the swap to real data doesn't
 * jolt layout.
 */
export function SkeletonRows({ columns, rows = 8, widths }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={rowIdx} className="pointer-events-none">
          {Array.from({ length: columns }).map((_, colIdx) => {
            const width =
              widths?.[colIdx] ??
              DEFAULT_WIDTHS[(rowIdx + colIdx) % DEFAULT_WIDTHS.length];
            return (
              <TableCell key={colIdx}>
                <div
                  className="h-2.5 animate-pulse rounded-sm bg-muted"
                  style={{ width }}
                  aria-hidden
                />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}
