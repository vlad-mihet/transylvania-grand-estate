"use client";

import type { ReactNode } from "react";
import { cn } from "@tge/utils";
import { X } from "lucide-react";

export interface FilterRailProps {
  children: ReactNode;
  onClear?: () => void;
  activeCount?: number;
  className?: string;
}

/**
 * Collapsible left rail of facet filters — the YC-directory pattern of
 * checkbox + category groupings. A single "Clear" button sits at the top
 * when any filter is active.
 */
export function FilterRail({
  children,
  onClear,
  activeCount = 0,
  className,
}: FilterRailProps) {
  return (
    <aside
      className={cn(
        "flex w-60 shrink-0 flex-col gap-5 border-r border-border bg-card/50 p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Filters
        </span>
        {activeCount > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear ({activeCount})
          </button>
        )}
      </div>
      {children}
    </aside>
  );
}

interface FilterGroupProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FilterGroup({ title, children, className }: FilterGroupProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  count?: number;
  className?: string;
}

export function FilterCheckbox({
  label,
  checked,
  onChange,
  count,
  className,
}: FilterCheckboxProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-sm transition-colors hover:bg-muted",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 shrink-0 rounded-sm border-border accent-[var(--color-copper)]"
      />
      <span className="min-w-0 flex-1 truncate text-foreground/90">
        {label}
      </span>
      {typeof count === "number" && (
        <span className="mono text-[11px] text-muted-foreground">{count}</span>
      )}
    </label>
  );
}

interface FilterChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

/**
 * Active-filter indicator above the list (or in the sub-header) — click to
 * remove. Matches the YC pattern where selected facets collapse into chips.
 */
export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-0.5 text-xs text-foreground",
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-sm text-muted-foreground/60 transition-colors hover:text-foreground"
          aria-label={`Remove filter ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
