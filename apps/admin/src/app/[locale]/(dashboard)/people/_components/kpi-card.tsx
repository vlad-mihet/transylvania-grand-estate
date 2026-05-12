"use client";

import type { ComponentType } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@tge/ui";

import { Link } from "@/i18n/navigation";
import { cn } from "@tge/utils";

interface KpiCardProps {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  total: number | undefined;
  isLoading: boolean;
  /** One-line caption rendered under the count (e.g. "3 pending invites"). */
  caption?: string;
  /** Highlights the caption in copper when set — used when the secondary
   * count is non-zero and worth attention. */
  captionAttention?: boolean;
}

export function KpiCard({
  label,
  icon: Icon,
  href,
  total,
  isLoading,
  caption,
  captionAttention,
}: KpiCardProps) {
  return (
    <Link href={href as Parameters<typeof Link>[0]["href"]}>
      <Card className="card-hover h-full rounded-md border-border shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-1.5">
          <CardTitle className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-muted-foreground/70" />
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-7 w-14 animate-pulse rounded-sm bg-muted" />
          ) : (
            <p className="mono text-2xl font-semibold tabular-nums text-foreground">
              {total ?? 0}
            </p>
          )}
          {caption && (
            <p
              className={cn(
                "mt-1 text-[11px]",
                captionAttention
                  ? "text-copper"
                  : "text-muted-foreground",
              )}
            >
              {caption}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
