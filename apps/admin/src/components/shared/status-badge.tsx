"use client";

import { Badge } from "@tge/ui";
import { useTranslations } from "next-intl";

const statusStyles: Record<string, string> = {
  AVAILABLE: "bg-copper/10 text-copper-dark border-copper/20 hover:bg-copper/10",
  RESERVED: "bg-amber-900/10 text-amber-800 border-amber-800/15 hover:bg-amber-900/10",
  SOLD: "bg-muted text-muted-foreground border-border hover:bg-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("Status");

  return (
    <Badge
      variant="outline"
      className={`text-[10px] uppercase tracking-[0.08em] font-semibold ${statusStyles[status] ?? ""}`}
    >
      {t(status as "AVAILABLE" | "RESERVED" | "SOLD")}
    </Badge>
  );
}
