"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@tge/ui";
import { cn } from "@tge/utils";

interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Primary identifier for the record (name, slug, etc.). Goes in the SheetTitle. */
  title: ReactNode;
  /** Optional sub-line — contact links, breadcrumbs, etc. Renders as SheetDescription. */
  subtitle?: ReactNode;
  /** Top-right slot — typically a `<StatusBadge>`. */
  status?: ReactNode;
  /** Sticky bottom action row. Pass buttons in render order. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Right-side drawer for "preview a record" surfaces — entities with no
 * dedicated /[id] page. Portrait shape (~448px wide × full viewport height).
 * Sticky footer for actions; scrollable body for content sections.
 *
 * Layout convention: pair the title/subtitle/status header with a stack of
 * <DetailSheetSection label="…">. Each section is self-explaining via its
 * mono uppercase label, so a first-time reader doesn't have to guess what
 * a value represents — the chief failure mode of the previous flat-Dialog
 * shape that this primitive was created to replace.
 *
 * Reuse this component when adding peek surfaces for future entities. The
 * primitive is structural (header / body / footer); section contents stay
 * hand-crafted per entity.
 */
export function DetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  status,
  footer,
  children,
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border p-4">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0 flex-1 space-y-1">
              <SheetTitle className="truncate text-base">{title}</SheetTitle>
              {subtitle && (
                <SheetDescription asChild>
                  <div className="text-xs">{subtitle}</div>
                </SheetDescription>
              )}
            </div>
            {status && <div className="shrink-0">{status}</div>}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-1">{children}</div>

        {footer && (
          <SheetFooter className="flex-row items-center justify-end gap-2 border-t border-border bg-card/50 p-3">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface DetailSheetSectionProps {
  /** Section label — rendered mono-uppercase so it reads as metadata, not content. */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * One labeled block inside a DetailSheet body. The label always sits above
 * the value. Border separates each section so the eye finds the next group
 * naturally on scroll.
 */
export function DetailSheetSection({
  label,
  children,
  className,
}: DetailSheetSectionProps) {
  return (
    <section
      className={cn(
        "border-b border-border py-3 last:border-b-0",
        className,
      )}
    >
      <h3 className="mono mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </h3>
      <div className="text-sm text-foreground">{children}</div>
    </section>
  );
}
