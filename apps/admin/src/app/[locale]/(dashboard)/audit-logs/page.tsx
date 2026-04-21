"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@tge/ui";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { IdChip, Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  FilterCheckbox,
  FilterGroup,
  FilterRail,
} from "@/components/shared/filter-rail";
import { usePermissions } from "@/components/auth/auth-provider";
import { useResourceList } from "@/hooks/use-resource-list";
import { AuditDiff } from "@/components/audit/audit-diff";
import { getAccessToken } from "@/lib/api-client";

interface AuditLogEntry {
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

// Aligned with the API's `classify()` allow-list. Order matters for the
// filter rail — most-mutated resources first so reviewers find them faster.
const RESOURCES = [
  "Property",
  "Inquiry",
  "Article",
  "Agent",
  "AdminUser",
  "Invitation",
  "City",
  "County",
  "Neighborhood",
  "Developer",
  "Testimonial",
  "BankRate",
  "FinancialIndicator",
  "SiteConfig",
] as const;
type Resource = (typeof RESOURCES)[number];

const RESOURCE_TONE: Record<
  string,
  "info" | "success" | "warning" | "neutral"
> = {
  Property: "info",
  Inquiry: "success",
  Article: "warning",
  AdminUser: "neutral",
  Agent: "info",
  Invitation: "warning",
  SiteConfig: "neutral",
};

export default function AuditLogsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const t = useTranslations("AuditLogs");
  const tc = useTranslations("Common");

  useEffect(() => {
    if (!can("audit-log.read")) router.replace("/403");
  }, [can, router]);

  const [resourceFilter, setResourceFilter] = useState<Resource | "">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const list = useResourceList<AuditLogEntry>({
    resource: "audit-logs",
    endpoint: "/audit-logs",
    defaultLimit: 50,
    extraParams: { resource: resourceFilter || undefined },
    enabled: can("audit-log.read"),
  });

  const columns: ColumnDef<AuditLogEntry, unknown>[] = [
    {
      id: "createdAt",
      header: t("columnWhen"),
      size: 100,
      enableSorting: false,
      cell: ({ row }) => <RelativeTime value={row.original.createdAt} />,
    },
    {
      id: "actor",
      header: t("columnActor"),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.actor ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.actor.name}
            </p>
            <Mono className="truncate text-[11px] text-muted-foreground">
              {row.original.actor.email}
            </Mono>
          </div>
        ) : (
          <Mono className="text-muted-foreground">{t("systemActor")}</Mono>
        ),
    },
    {
      id: "action",
      header: t("columnAction"),
      enableSorting: false,
      cell: ({ row }) => <MonoTag>{row.original.action}</MonoTag>,
    },
    {
      id: "resource",
      header: t("columnResource"),
      enableSorting: false,
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.resource}
          tone={RESOURCE_TONE[row.original.resource] ?? "neutral"}
        />
      ),
    },
    {
      id: "resourceId",
      header: t("columnResourceId"),
      enableSorting: false,
      cell: ({ row }) => <IdChip>{row.original.resourceId}</IdChip>,
    },
    {
      id: "brand",
      header: t("columnBrand"),
      size: 90,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.brand ? (
          <Mono className="text-[11px] text-muted-foreground">
            {row.original.brand}
          </Mono>
        ) : null,
    },
    {
      id: "diff",
      header: "",
      size: 60,
      enableSorting: false,
      cell: ({ row }) => {
        const hasDiff = Array.isArray(row.original.diff);
        const isOpen = expandedId === row.original.id;
        if (!hasDiff && !row.original.before && !row.original.after) return null;
        return (
          <button
            type="button"
            className="text-xs font-medium text-copper hover:underline"
            onClick={() =>
              setExpandedId((curr) =>
                curr === row.original.id ? null : row.original.id,
              )
            }
          >
            {isOpen ? t("hideDiff") : t("showDiff")}
          </button>
        );
      },
    },
  ];

  const activeFilters = resourceFilter ? 1 : 0;

  return (
    <div className="space-y-3">
      <ResourceListPage<AuditLogEntry>
        title={t("title")}
        description={t("description")}
        list={list}
        columns={columns}
        rowId={(row) => row.id}
        activeFilters={activeFilters}
        headerActions={
          can("audit-log.export") ? <ExportButton /> : null
        }
        filterRail={
          <FilterRail
            activeCount={activeFilters}
            onClear={() => setResourceFilter("")}
          >
            <FilterGroup title={t("columnResource")}>
              {RESOURCES.map((r) => (
                <FilterCheckbox
                  key={r}
                  label={r}
                  checked={resourceFilter === r}
                  onChange={(checked) => setResourceFilter(checked ? r : "")}
                />
              ))}
            </FilterGroup>
          </FilterRail>
        }
        searchPlaceholder={t("searchPlaceholder")}
        emptyTitle={tc("emptyTitle")}
        emptyDescription={t("empty")}
      />

      {expandedId &&
        list.items?.find((i) => i.id === expandedId) && (
          <ExpandedDiffCard
            entry={list.items.find((i) => i.id === expandedId)!}
            onClose={() => setExpandedId(null)}
          />
        )}
    </div>
  );
}

function ExpandedDiffCard({
  entry,
  onClose,
}: {
  entry: AuditLogEntry;
  onClose: () => void;
}) {
  const t = useTranslations("AuditLogs");
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t("diffFor")} <MonoTag>{entry.action}</MonoTag>
          </p>
          <Mono className="mt-0.5 text-[11px] text-muted-foreground">
            {entry.resource} #{entry.resourceId}
          </Mono>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          {t("hideDiff")}
        </button>
      </div>
      <div className="p-5">
        <AuditDiff resource={entry.resource} diff={entry.diff} />
        {!Array.isArray(entry.diff) &&
          (entry.before != null || entry.after != null) && (
            <pre className="mt-2 overflow-x-auto rounded-sm bg-muted p-2 text-[11px] text-muted-foreground">
              {JSON.stringify(
                { before: entry.before, after: entry.after },
                null,
                2,
              )}
            </pre>
          )}
      </div>
    </div>
  );
}

function ExportButton() {
  const t = useTranslations("AuditLogs");
  const [busy, setBusy] = useState(false);

  // Fetch + Blob rather than window.open(): the bearer lives in memory only,
  // so we can't send Authorization on a navigation. Streamed response is
  // accumulated in the Blob, then a synthetic anchor click triggers the
  // download. Memory cost ≈ size of the CSV, which for current scale
  // (~thousands of rows) is well under a megabyte.
  const handleExport = async () => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    setBusy(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/audit-logs/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={busy}
    >
      <Download className="mr-1.5 h-3.5 w-3.5" />
      {t("export")}
    </Button>
  );
}
