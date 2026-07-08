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
        "bg-black/55 backdrop-blur-md text-cream/95 uppercase tracking-[0.15em] font-semibold border border-white/15 pointer-events-none",
        compact ? "text-[9px] px-2 py-0.5" : "text-[10px] px-3 py-1.5",
        className,
      )}
    >
      {t(compact ? "demoImageBadgeShort" : "demoImageBadge")}
    </Badge>
  );
}
