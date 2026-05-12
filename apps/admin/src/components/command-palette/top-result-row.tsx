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
}

/**
 * Elevated row variant used for the "Top result" lead slot in the palette.
 * Larger thumbnail (40×40 vs 32×32), heavier title, subtle copper-tinted
 * background, and a thicker copper left-border accent to mark it as the
 * promoted best match. Visually distinct from `<ResultRow />` without
 * shouting.
 *
 * Selection styling (`aria-selected:bg-copper/20`) is applied by the parent
 * via cmdk's `Command.Item`; this component just composes the inner content.
 */
export function TopResultRow({ icon: Icon, imageUrl, title, subtitle, badge }: Props) {
  return (
    <div className="flex w-full items-center gap-3 rounded-sm border-l-[3px] border-copper bg-copper/[0.04] px-2 py-2.5">
      <Thumb icon={Icon} imageUrl={imageUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-semibold leading-tight text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-xs leading-tight text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
      {badge && (
        <span className="mono shrink-0 rounded-sm border border-copper/30 bg-copper/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.04em] text-copper">
          {badge}
        </span>
      )}
      <ArrowUpRight
        className={cn(
          "h-4 w-4 shrink-0 text-copper/0 transition-colors",
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
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-copper/30 bg-muted">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="40px"
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-copper/30 bg-copper/10 text-copper">
      <Icon className="h-5 w-5" />
    </div>
  );
}
