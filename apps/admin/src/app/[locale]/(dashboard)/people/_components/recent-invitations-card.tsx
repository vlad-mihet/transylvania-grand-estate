"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { SectionCard } from "@/components/shared/section-card";
import { useRecentInvitations } from "@/lib/people/use-people-overview";

export function RecentInvitationsCard() {
  const t = useTranslations("People.home");
  const tSource = useTranslations("People.sourceChip");
  const { items, isLoading, isEnabled } = useRecentInvitations();

  if (!isEnabled) return null;

  return (
    <SectionCard
      title={t("recentInvites.title")}
      headerActions={
        <Link
          href="/people/invitations"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] text-muted-foreground hover:text-copper"
        >
          {t("recentInvites.viewAll")}
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
          {t("empty.recentInvites")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((row) => (
            <li key={row.id} className="py-2">
              <Link
                href={row.href as Parameters<typeof Link>[0]["href"]}
                className="flex items-center justify-between gap-3 hover:text-copper"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.displayName}
                  </p>
                  <Mono className="truncate text-[11px] text-muted-foreground">
                    {row.email}
                  </Mono>
                </div>
                <span className="mono shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                  {tSource(row.source === "team" ? "team" : "academy")}
                </span>
                <RelativeTime
                  value={row.createdAt}
                  className="shrink-0 text-[11px] text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
