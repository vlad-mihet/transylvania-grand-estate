import type { ReactNode } from "react";
import { cn } from "@tge/utils";

export interface DefinitionListItem {
  label: string;
  value: ReactNode;
  /** When true, row spans both columns — use for long text fields. */
  wide?: boolean;
}

interface DefinitionListProps {
  items: DefinitionListItem[];
  className?: string;
}

/**
 * Two-column label/value grid for read-only detail pages. Stacks on mobile
 * (label above value), switches to 2-col at `sm`. Null/undefined values render
 * as a muted em-dash so the row keeps its rhythm.
 */
export function DefinitionList({ items, className }: DefinitionListProps) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("space-y-1", item.wide && "sm:col-span-2")}
        >
          <dt className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {item.label}
          </dt>
          <dd className="text-sm text-foreground">
            {item.value ?? (
              <span className="text-muted-foreground/60">—</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
