"use client";

import { type ReactNode } from "react";

interface InfoCardProps {
  title: string;
  /** Optional right-aligned slot in the header (e.g. a count, a status pill). */
  aside?: ReactNode;
  /** Optional footer (e.g. small action links, "view all"). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Visual chrome shared by all entry-editor info-rail cards. Intentionally
 * thin — content density and spacing decisions live inside each card so
 * `ActivityCard` (list) and `StatusCard` (key/value rows) can present
 * differently without forking the wrapper.
 */
export function InfoCard({ title, aside, footer, children }: InfoCardProps) {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <p className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </p>
        {aside}
      </header>
      <div className="px-3.5 py-3 text-[12px]">{children}</div>
      {footer ? (
        <footer className="border-t border-border bg-muted/30 px-3.5 py-2 text-[11px] text-muted-foreground">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 first:pt-0 last:pb-0">
      <span className="mono shrink-0 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-right text-[12px] text-foreground">
        {children}
      </span>
    </div>
  );
}
