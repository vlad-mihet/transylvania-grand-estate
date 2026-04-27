"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** Optional ref to the list container. Used to scroll to top on page change. */
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
  /** Smaller variant for tighter surfaces (e.g. course TOC). */
  compact?: boolean;
}

/**
 * Generates the truncated sequence of page numbers to render. Always shows
 * the first and last page; surrounds the current page with up to 1
 * neighbour on each side; inserts `"ellipsis"` markers between non-adjacent
 * spans. Output for page=5/total=10: [1, "ellipsis", 4, 5, 6, "ellipsis", 10].
 */
function buildPageRange(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: Array<number | "ellipsis"> = [];
  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);
  items.push(1);
  if (left > 2) items.push("ellipsis");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  scrollTargetRef,
  compact = false,
}: PaginationProps) {
  const t = useTranslations("Academy.pagination");
  const navRef = useRef<HTMLElement | null>(null);
  const previousPage = useRef(page);

  // Smooth scroll the list container (or the nav) into view on page change.
  // Skipped on the very first render so initial mounts don't yank the
  // viewport when the catalog/TOC arrives.
  useEffect(() => {
    if (previousPage.current === page) return;
    previousPage.current = page;
    const el = scrollTargetRef?.current ?? navRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page, scrollTargetRef]);

  // Arrow-key navigation while the nav has focus. Enter/Space on a button
  // already triggers `onClick`; this adds left/right within the nav too,
  // which feels right for a numbered pager.
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowLeft" && page > 1) {
      e.preventDefault();
      onPageChange(page - 1);
    } else if (e.key === "ArrowRight" && page < totalPages) {
      e.preventDefault();
      onPageChange(page + 1);
    }
  };

  if (totalPages <= 1) {
    // A single-page result still renders the summary text — students like
    // knowing the total even when no nav is needed.
    return (
      <p
        className={cn(
          "text-center text-[color:var(--color-muted-foreground)]",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {total === 0 ? t("emptySummary") : t("singlePageSummary", { total })}
      </p>
    );
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const range = buildPageRange(page, totalPages);

  const buttonBase = cn(
    "inline-flex items-center justify-center rounded-md border transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2",
    compact ? "min-w-8 h-8 px-2 text-xs" : "min-w-9 h-9 px-3 text-sm",
  );
  const idleBtn =
    "border-[color:var(--color-border)] text-foreground hover:bg-[color:var(--color-muted)]";
  const activeBtn =
    "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-white";
  const disabledBtn =
    "border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)] opacity-50 cursor-not-allowed";

  return (
    <nav
      ref={navRef}
      aria-label={t("ariaLabel")}
      onKeyDown={onKeyDown}
      className="flex flex-col items-center gap-3"
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(buttonBase, page <= 1 ? disabledBtn : idleBtn)}
          aria-label={t("previousAria")}
        >
          <span aria-hidden="true">←</span>
          <span className="ml-1.5 hidden sm:inline">{t("previous")}</span>
        </button>

        {range.map((item, idx) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              aria-hidden="true"
              className={cn(
                "select-none px-1 text-[color:var(--color-muted-foreground)]",
                compact ? "text-xs" : "text-sm",
              )}
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
              aria-label={t("pageAria", { page: item })}
              className={cn(buttonBase, item === page ? activeBtn : idleBtn)}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(buttonBase, page >= totalPages ? disabledBtn : idleBtn)}
          aria-label={t("nextAria")}
        >
          <span className="mr-1.5 hidden sm:inline">{t("next")}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p
        className={cn(
          "text-[color:var(--color-muted-foreground)]",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {t("rangeSummary", { start, end, total })}
      </p>
    </nav>
  );
}
