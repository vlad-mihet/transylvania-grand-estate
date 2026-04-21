"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { ErrorState } from "@/components/shared/states";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";

interface AuditEntry {
  id: string;
  actorId: string | null;
  actor: { id: string; email: string; name: string } | null;
  action: string;
  resource: string;
  resourceId: string;
  createdAt: string;
}

const RESOURCE_TONE: Record<string, "info" | "success" | "warning" | "neutral"> = {
  Property: "info",
  Inquiry: "success",
  Article: "warning",
  AdminUser: "neutral",
};

export function AuditLogFeed() {
  const t = useTranslations("Dashboard");
  const tAudit = useTranslations("AuditLogs");
  const tc = useTranslations("Common");
  const { can } = usePermissions();
  const enabled = can("audit-log.read");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-audit-log"],
    queryFn: () => apiClient<AuditEntry[]>("/audit-logs?limit=5"),
    enabled,
    staleTime: 30_000,
  });

  if (!enabled) return null;

  // Translate raw action identifiers (e.g. "user.login-password") into a
  // human phrase. Falls back to a humanised version of the raw string so
  // unmapped actions still read reasonably.
  const actionLabel = (action: string): string => {
    const [noun, verb] = action.split(".");
    if (noun && verb) {
      const key = `actionLabel.${noun}.${verb}` as Parameters<
        typeof tAudit.has
      >[0];
      if (tAudit.has(key)) {
        return tAudit(key as Parameters<typeof tAudit>[0]);
      }
    }
    return action.replace(/[-.]/g, " ");
  };

  const items = Array.isArray(data) ? data : [];

  // Hide entirely when empty — no value in showing an "empty" card to the
  // lone SUPER_ADMIN reader.
  if (!isLoading && !isError && items.length === 0) return null;

  return (
    <SectionCard
      title={t("recentActivity")}
      headerActions={
        <Link
          href="/audit-logs"
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
        <RowSkeleton />
      ) : (
        <ul className="-mx-5 divide-y divide-border">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-3">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-copper/10 text-[10px] font-semibold uppercase tracking-wider text-copper">
                {initials(e.actor?.name ?? null)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  <span className="font-medium">
                    {e.actor?.name ?? tAudit("systemActor")}
                  </span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-foreground/80">
                    {actionLabel(e.action)}
                  </span>
                </p>
                <Mono className="truncate text-[11px] text-muted-foreground">
                  #{e.resourceId.slice(0, 8)}
                </Mono>
              </div>
              <StatusBadge
                status={e.resource}
                tone={RESOURCE_TONE[e.resource] ?? "neutral"}
              />
              <RelativeTime
                value={e.createdAt}
                className="w-12 text-right text-muted-foreground"
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function initials(name: string | null): string {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "··";
}

function RowSkeleton() {
  return (
    <ul className="-mx-5 divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="h-7 w-7 shrink-0 animate-pulse rounded-sm bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-48 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded-sm bg-muted/70" />
          </div>
          <div className="h-4 w-16 animate-pulse rounded-sm bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded-sm bg-muted" />
        </li>
      ))}
    </ul>
  );
}
