"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@tge/ui";
import { apiClient } from "@/lib/api-client";
import { RelativeTime } from "@/components/shared/relative-time";
import { Link } from "@/i18n/navigation";
import { InfoCard } from "./info-card";

interface AuditEntry {
  id: string;
  actor: { id: string; email: string; name: string } | null;
  action: string;
  createdAt: string;
}

interface AuditEnvelope {
  data: AuditEntry[];
  meta: { total: number; page: number; limit: number };
}

export interface ActivityCardProps {
  /** Prisma model name: "Article", "Property", "Agent", "City", ... */
  resource: string;
  /** Resource id. */
  resourceId: string;
  /** Number of entries to show — default 5. */
  limit?: number;
}

/**
 * Recent audit-log entries scoped to one entity. Reads from
 * GET /audit-logs/by-entity/:resource/:id (already role-scoped server-side)
 * and renders a compact timeline. For the full diff view, the "View all"
 * footer links into the dedicated audit-logs page filtered to this entity.
 */
export function ActivityCard({
  resource,
  resourceId,
  limit = 5,
}: ActivityCardProps) {
  const query = useQuery({
    queryKey: ["entry-editor-activity", resource, resourceId, limit],
    queryFn: () =>
      apiClient<AuditEnvelope>(
        `/audit-logs/by-entity/${encodeURIComponent(resource)}/${encodeURIComponent(resourceId)}?limit=${limit}`,
        { envelope: true },
      ),
    staleTime: 30_000,
  });

  const entries = query.data?.data ?? [];

  return (
    <InfoCard
      title="Activity"
      aside={
        query.data?.meta?.total ? (
          <span className="mono text-[10px] text-muted-foreground">
            {query.data.meta.total} total
          </span>
        ) : null
      }
      footer={
        entries.length > 0 ? (
          <Link
            href={
              `/audit-logs?resource=${encodeURIComponent(resource)}&resourceId=${encodeURIComponent(resourceId)}` as Parameters<
                typeof Link
              >[0]["href"]
            }
            className="hover:text-copper"
          >
            View full history →
          </Link>
        ) : null
      }
    >
      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : query.isError ? (
        <p className="text-[11px] text-muted-foreground">
          Could not load activity.
        </p>
      ) : entries.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No activity yet — changes will appear here once you save.
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2 text-[12px]">
              <span
                aria-hidden
                className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-copper/60"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-foreground">
                  {humanizeAction(entry.action)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {entry.actor?.name || entry.actor?.email || "System"} ·{" "}
                  <RelativeTime
                    value={entry.createdAt}
                    className="text-[11px]"
                  />
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </InfoCard>
  );
}

/**
 * Audit actions arrive as dot-cased strings ("article.update", "user.role-changed").
 * Strip the resource prefix and turn the rest into Title Case for display so
 * editors don't have to read schema tokens.
 */
function humanizeAction(raw: string): string {
  const after = raw.includes(".") ? raw.split(".").slice(1).join(".") : raw;
  return after
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
