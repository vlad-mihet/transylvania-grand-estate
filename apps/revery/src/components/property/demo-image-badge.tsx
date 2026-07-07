"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@tge/ui";
import { cn } from "@tge/utils";

// Every listing on the site is illustrative placeholder content, not real
// inventory. This badge labels each property image as a sample so visitors
// don't mistake it for an actual property. Set NEXT_PUBLIC_DEMO_CONTENT="false"
// to remove it site-wide once real listings are published.
const DEMO_CONTENT = process.env.NEXT_PUBLIC_DEMO_CONTENT !== "false";

// `compact` renders the one-word label ("Example") for small surfaces like
// gallery thumbnails, where the full disclaimer would wrap and clutter.
export function DemoImageBadge({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("Common");
  if (!DEMO_CONTENT) return null;
  return (
    <Badge
      className={cn(
        "bg-background/80 backdrop-blur-md text-foreground/90 uppercase tracking-wide font-medium border border-border pointer-events-none",
        compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2.5 py-1",
        className,
      )}
    >
      {t(compact ? "demoImageBadgeShort" : "demoImageBadge")}
    </Badge>
  );
}
