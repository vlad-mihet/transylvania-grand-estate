import type { HTMLAttributes } from "react";
import { cn } from "@tge/utils";

/**
 * Text rendered in the workbench mono font. Use for IDs, slugs, timestamps,
 * keyboard shortcuts, and YC-style tag chips (`PROP-1843`, `MUREȘ`).
 */
export function Mono({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "mono tabular-nums text-[0.8125rem] text-muted-foreground",
        className,
      )}
    />
  );
}

/**
 * Small uppercase tag — the YC batch-label look (`S24`, `W25`).
 * Used for read-only facet chips on list rows.
 */
export function MonoTag({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "mono inline-flex items-center rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground",
        className,
      )}
    />
  );
}

/**
 * ID chip — clickable-feeling mono label for entity identifiers.
 */
export function IdChip({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: React.ReactNode }) {
  return (
    <span
      {...props}
      className={cn(
        "mono inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Keyboard-hint chip — renders a shortcut like `⌘K` in mono.
 */
export function Kbd({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <kbd
      {...(props as object)}
      className={cn(
        "mono inline-flex items-center rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
