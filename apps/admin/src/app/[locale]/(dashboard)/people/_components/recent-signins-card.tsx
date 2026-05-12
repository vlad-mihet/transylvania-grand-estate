"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { SectionCard } from "@/components/shared/section-card";
import { useRecentSignins } from "@/lib/people/use-people-overview";

export function RecentSigninsCard() {
  const t = useTranslations("People.home");
  const { items, isLoading, isEnabled } = useRecentSignins();

  if (!isEnabled) return null;

  return (
    <SectionCard
      title={t("recentSignins.title")}
      headerActions={
        <Link
          href="/audit-logs"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] text-muted-foreground hover:text-copper"
        >
          {t("recentSignins.viewAll")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      {isLoading ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-9 animate-pulse rounded-sm bg-muted" />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("empty.recentSignins")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {row.displayName}
                </p>
                {row.email && (
                  <Mono className="truncate text-[11px] text-muted-foreground">
                    {row.email}
                  </Mono>
                )}
              </div>
              <RelativeTime
                value={row.createdAt}
                className="shrink-0 text-[11px] text-muted-foreground"
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
