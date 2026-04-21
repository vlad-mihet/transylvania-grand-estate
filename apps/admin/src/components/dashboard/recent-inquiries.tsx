"use client";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, HardHat, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";

type InquiryStatus = "new" | "read" | "archived";
type InquiryType = "general" | "property" | "developer";

interface Inquiry {
  id: string;
  type: InquiryType;
  status: InquiryStatus;
  name: string;
  email: string;
  entityName?: string | null;
  createdAt: string;
}

const TYPE_ICON: Record<InquiryType, LucideIcon> = {
  property: Building2,
  developer: HardHat,
  general: Briefcase,
};

export function RecentInquiries() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const { can } = usePermissions();
  const enabled = can("inquiry.read");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-recent-inquiries"],
    queryFn: () => apiClient<Inquiry[]>("/inquiries?limit=5&sort=newest"),
    enabled,
    staleTime: 30_000,
  });

  if (!enabled) return null;

  const items = Array.isArray(data) ? data : [];

  return (
    <SectionCard
      title={t("recentInquiries")}
      headerActions={
        <Link
          href="/inquiries"
          className="mono text-[11px] font-semibold uppercase tracking-[0.06em] text-copper hover:text-[var(--color-copper-dark)]"
        >
          {t("viewAll")} →
        </Link>
      }
    >
      {isError ? (
        <ErrorState
          title={tc("loadError")}
          description=""
          retryLabel={tc("tryAgain")}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <InquirySkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("emptyInquiries")}
          icon={<MessageSquare className="h-6 w-6" />}
        />
      ) : (
        <ul className="-mx-5 divide-y divide-border">
          {items.map((inq) => {
            const Icon = TYPE_ICON[inq.type] ?? Briefcase;
            return (
              <li
                key={inq.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-muted text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {inq.name}
                  </p>
                  <Mono className="truncate text-[11px] text-muted-foreground">
                    {inq.entityName ? `${inq.entityName} · ` : ""}
                    {inq.email}
                  </Mono>
                </div>
                <StatusBadge status={inq.status} />
                <RelativeTime
                  value={inq.createdAt}
                  className="w-12 text-right text-muted-foreground"
                />
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function InquirySkeleton() {
  return (
    <ul className="-mx-5 divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-sm bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-40 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded-sm bg-muted/70" />
          </div>
          <div className="h-4 w-14 animate-pulse rounded-sm bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded-sm bg-muted" />
        </li>
      ))}
    </ul>
  );
}
