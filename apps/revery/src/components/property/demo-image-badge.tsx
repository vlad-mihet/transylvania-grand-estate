"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@tge/ui";
import { cn } from "@tge/utils";

// Every listing on the site is illustrative placeholder content, not real
// inventory. This badge labels each property image as a sample so visitors
// don't mistake it for an actual property. Set NEXT_PUBLIC_DEMO_CONTENT="false"
// to remove it site-wide once real listings are published.
const DEMO_CONTENT = process.env.NEXT_PUBLIC_DEMO_CONTENT !== "false";

export function DemoImageBadge({ className }: { className?: string }) {
  const t = useTranslations("Common");
  if (!DEMO_CONTENT) return null;
  return (
    <Badge
      className={cn(
        "bg-background/80 backdrop-blur-md text-foreground/90 text-[10px] uppercase tracking-wide font-medium border border-border px-2.5 py-1 pointer-events-none",
        className,
      )}
    >
      {t("demoImageBadge")}
    </Badge>
  );
}
