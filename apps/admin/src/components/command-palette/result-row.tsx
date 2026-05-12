"use client";

import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@tge/utils";

interface Props {
  icon: LucideIcon;
  imageUrl?: string | null;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  /** Optional trailing meta (e.g. relative time for recents). */
  meta?: string | null;
  /** Optional secondary action (× button) rendered on hover. */
  trailingAction?: React.ReactNode;
}

/**
 * Shared row for the unified palette — used for both live entity results and
 * server-recents. 32×32 square thumbnail (rounded, NOT circular — matches the
 * masculine workbench feel of the rest of the admin), with a tinted icon
 * fallback when no media is available.
 *
 * Selection styling (`bg-muted` + copper accent) is applied by the parent via
 * cmdk's `aria-selected="true"`; rendered as a `group` so children can react.
 */
export function ResultRow({
  icon: Icon,
  imageUrl,
  title,
  subtitle,
  badge,
  meta,
  trailingAction,
}: Props) {
  return (
    <div className="group/row flex w-full items-center gap-3">
      <Thumb icon={Icon} imageUrl={imageUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium leading-tight text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-[11px] leading-tight text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
      {badge && (
        <span className="mono shrink-0 rounded-sm border border-border bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
          {badge}
        </span>
      )}
      {meta && (
        <span className="mono shrink-0 text-[10px] uppercase tracking-[0.06em] text-muted-foreground/70">
          {meta}
        </span>
      )}
      {trailingAction && (
        <span className="opacity-0 transition-opacity group-hover/row:opacity-100">
          {trailingAction}
        </span>
      )}
      <ArrowUpRight
        className={cn(
          "h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors",
          "group-aria-selected:text-copper",
        )}
      />
    </div>
  );
}

function Thumb({
  icon: Icon,
  imageUrl,
}: {
  icon: LucideIcon;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="32px"
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/60 text-muted-foreground group-aria-selected:border-copper/30 group-aria-selected:bg-copper/10 group-aria-selected:text-copper">
      <Icon className="h-4 w-4" />
    </div>
  );
}
