"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { SectionCard } from "@/components/shared/section-card";
import { ErrorState, EmptyState } from "@tge/ui";

import { AuditDiff } from "./audit-diff";

interface AuditEntry {
  id: string;
  actorId: string | null;
  actor: { id: string; email: string; name: string } | null;
  action: string;
  resource: string;
  resourceId: string;
  diff: unknown;
  before: unknown;
  after: unknown;
  requestId: string | null;
  brand: string | null;
  method: string | null;
  url: string | null;
  createdAt: string;
}

interface AuditEnvelope {
  data: AuditEntry[];
  meta: { total: number; page: number; limit: number };
}

interface HistoryTabProps {
  /** Prisma model name as used by the API: "Property", "Agent", "City", … */
  resource: string;
  /** Resource id (uuid for most models, string key for FinancialIndicator). */
  resourceId: string;
  /** Optional title override; defaults to the i18n "history" label. */
  title?: string;
}

/**
 * Per-entity audit timeline. Drop into a resource detail page (property,
 * agent, city, developer, …) to surface the change history without leaving
 * the page. Reads from GET /audit-logs/by-entity/:resource/:id which is
 * role-scoped on the server — an AGENT looking at a property they own sees
 * just their actions; a SUPER_ADMIN sees everything.
 *
 * Entries are collapsed by default (just header + relative time); clicking
 * one expands the diff renderer. We deliberately avoid pre-expanding even
 * the latest row — long histories on Property have ~50+ entries and an
 * always-open list would dominate the page.
 */
export function HistoryTab({ resource, resourceId, title }: HistoryTabProps) {
  const t = useTranslations("AuditLogs");
  const tc = useTranslations("Common");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-history", resource, resourceId],
    queryFn: () =>
      apiClient<AuditEnvelope>(
        `/audit-logs/by-entity/${encodeURIComponent(
          resource,
        )}/${encodeURIComponent(resourceId)}?limit=50`,
        { envelope: true },
      ),
    staleTime: 15_000,
  });

  return (
    <SectionCard title={title ?? t("historyTitle")}>
      {isError ? (
        <ErrorState
          title={tc("loadError")}
          description=""
          retryLabel={tc("tryAgain")}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <RowSkeleton />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title={t("historyEmpty")} description="" />
      ) : (
        <ul className="-mx-5 divide-y divide-border">
          {data.data.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function HistoryRow({ entry }: { entry: AuditEntry }) {
  const t = useTranslations("AuditLogs");
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    Array.isArray(entry.diff) ||
    entry.before != null ||
    entry.after != null;

  return (
    <li className="px-5 py-3">
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((x) => !x)}
        className="flex w-full items-center gap-3 text-left"
        disabled={!hasDetails}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">
            <span className="font-medium">
              {entry.actor?.name ?? t("systemActor")}
            </span>
            <span className="text-muted-foreground"> · </span>
            <MonoTag>{entry.action}</MonoTag>
          </p>
          {entry.requestId && (
            <Mono className="text-[11px] text-muted-foreground">
              req: {entry.requestId.slice(0, 8)}
              {entry.brand ? ` · ${entry.brand}` : ""}
            </Mono>
          )}
        </div>
        <RelativeTime
          value={entry.createdAt}
          className="w-16 text-right text-muted-foreground"
        />
        {hasDetails && (
          <span aria-hidden className="text-muted-foreground">
            {expanded ? "▾" : "▸"}
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-3 ml-0">
          <AuditDiff resource={entry.resource} diff={entry.diff} />
          {!Array.isArray(entry.diff) && (
            <pre className="mt-2 overflow-x-auto rounded-sm bg-muted p-2 text-[11px] text-muted-foreground">
              {JSON.stringify(
                { before: entry.before, after: entry.after },
                null,
                2,
              )}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}

function RowSkeleton() {
  return (
    <ul className="-mx-5 divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-56 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded-sm bg-muted/70" />
          </div>
          <div className="h-4 w-12 animate-pulse rounded-sm bg-muted" />
        </li>
      ))}
    </ul>
  );
}
