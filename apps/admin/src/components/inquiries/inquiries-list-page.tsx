"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { toast as sonnerToast } from "sonner";
import {
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tge/ui";
import {
  DetailSheet,
  DetailSheetSection,
} from "@/components/shared/detail-sheet";
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "lucide-react";
import {
  Archive,
  CheckCheck,
  KanbanSquare,
  List,
  Mail,
  Phone,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { parseAsStringEnum, useQueryState } from "nuqs";

import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { RowActions } from "@/components/shared/row-actions";
import { Mono, MonoTag } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import { Can } from "@/components/shared/can";
import {
  FilterCheckbox,
  FilterGroup,
  FilterRail,
} from "@/components/shared/filter-rail";
import { InquiryKanbanBoard } from "@/components/inquiries/kanban-board";
import {
  useResourceList,
  type PaginatedResponse,
} from "@/hooks/use-resource-list";
import { cn } from "@tge/utils";

type InquiryStatus = "new" | "read" | "archived";
type InquiryType = "general" | "property" | "developer";

/** Localized title bag returned by the API. RO is canonical; others optional. */
type LocalizedTitle = Partial<Record<"ro" | "en" | "fr" | "de", string>>;

interface InquiryProperty {
  id: string;
  slug: string;
  title: LocalizedTitle;
}

interface Inquiry {
  id: string;
  type: InquiryType;
  status: InquiryStatus;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  entityName?: string | null;
  entitySlug?: string | null;
  propertySlug?: string | null;
  /** Joined Property row when the inquiry is linked. Title is multilingual. */
  property?: InquiryProperty | null;
  budget?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
  /** GDPR consent stamp + version (Wave A of contact-flow audit). */
  consentedAt?: string | null;
  gdprConsentVersion?: string | null;
  marketingConsent?: boolean | null;
  /** Brand isolation primitive (Wave B-1). */
  siteId?: "TGE_LUXURY" | "REVERY" | "ACADEMY" | null;
  /** Originating-app code for the unified queue's filter chips. */
  app?: "landing" | "revery" | "academy" | "admin" | null;
  /** Submitter UI locale at submission time (PR 4a). Nullable for legacy
   *  rows pre-migration; surfaces in the peek sheet so admins replying to
   *  an old inquiry know what language to write back in. */
  locale?: "ro" | "en" | "fr" | "de" | null;
  /** Soft-delete timestamp (Wave B-4). null = live row. */
  deletedAt?: string | null;
}

/**
 * Pick the best-fit title from a multilingual bag. Priority: current locale →
 * RO (canonical) → first available value. Falls back to slug if the bag is
 * unexpectedly empty (shouldn't happen — every property has a RO title).
 */
function pickTitle(
  title: LocalizedTitle | undefined,
  locale: string,
  slug: string,
): string {
  if (!title) return slug;
  const codes: Array<keyof LocalizedTitle> = [
    locale as keyof LocalizedTitle,
    "ro",
    "en",
    "fr",
    "de",
  ];
  for (const code of codes) {
    const value = title[code];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return slug;
}

const STATUSES: InquiryStatus[] = ["new", "read", "archived"];
const TYPES: InquiryType[] = ["general", "property", "developer"];

interface InquiriesListPageProps {
  /** Page header title. Defaults to `Inquiries.title`. */
  title?: string;
}

/**
 * Shared body of the inquiries list view — supports both list and Kanban
 * modes via a `?view=` query param. Used by `/inquiries` (admin) and
 * `/my-inquiries` (agent), which differ only in title. `<Can>` wrappers
 * handle AGENT-role gating (no bulk delete, no per-row delete) against the
 * same data since the API auto-scopes for AGENT.
 */
export function InquiriesListPage({ title }: InquiriesListPageProps = {}) {
  const queryClient = useQueryClient();
  const t = useTranslations("Inquiries");
  const tc = useTranslations("Common");
  const locale = useLocale();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  // Status filter is URL-driven so the AttentionStrip "new inquiries" tile
  // (href="/inquiries?status=new") lands with the filter pre-applied.
  const [statusFilter, setStatusFilter] = useQueryState<InquiryStatus | "">(
    "status",
    parseAsStringEnum<InquiryStatus | "">([
      "",
      "new",
      "read",
      "archived",
    ]).withDefault(""),
  );
  const [typeFilter, setTypeFilter] = useState<InquiryType | "">("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [viewing, setViewing] = useState<Inquiry | null>(null);
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum<"list" | "kanban">(["list", "kanban"]).withDefault("list"),
  );

  const effectiveTitle = title ?? t("title");

  const trimmedSource = sourceFilter.trim();

  const list = useResourceList<Inquiry>({
    resource: "inquiries",
    defaultLimit: 20,
    extraParams: {
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      source: trimmedSource || undefined,
    },
    enabled: view === "list",
  });

  const kanbanQuery = useQuery({
    queryKey: [
      "inquiries-kanban",
      {
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        source: trimmedSource || undefined,
      },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (trimmedSource) params.set("source", trimmedSource);
      return apiClient<PaginatedResponse<Inquiry> | Inquiry[]>(
        `/inquiries?${params.toString()}`,
      );
    },
    enabled: view === "kanban",
    staleTime: 15_000,
  });

  const kanbanItems: Inquiry[] = (() => {
    const data = kanbanQuery.data;
    if (!data) return [];
    return Array.isArray(data) ? data : data.data;
  })();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    queryClient.invalidateQueries({ queryKey: ["inquiries-kanban"] });
    queryClient.invalidateQueries({ queryKey: ["inquiries-unread"] });
  };

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/inquiries/${id}/restore`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast.success(t("restored"));
    },
    onError: () => toast.error(t("restoreFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/inquiries/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      invalidate();
      // Soft-delete + undo: surface the restore action right where the
      // operator's attention already is. Five-second window matches the
      // sonner default; longer would feel sticky.
      sonnerToast.success(t("deleted"), {
        action: {
          label: t("undo"),
          onClick: () => restoreMutation.mutate(id),
        },
      });
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiClient(`/inquiries/${id}`, { method: "DELETE" })),
      );
      return ids;
    },
    onSuccess: (ids) => {
      invalidate();
      sonnerToast.success(t("deleted"), {
        action: {
          label: t("undo"),
          onClick: () => {
            // Restore each soft-deleted id in parallel.
            for (const id of ids) restoreMutation.mutate(id);
          },
        },
      });
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InquiryStatus }) =>
      apiClient(`/inquiries/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["inquiries-kanban"] });
      const snapshots = queryClient.getQueriesData({
        queryKey: ["inquiries-kanban"],
      });
      for (const [key, value] of snapshots) {
        if (!value) continue;
        if (Array.isArray(value)) {
          queryClient.setQueryData(
            key,
            value.map((row: Inquiry) =>
              row.id === id ? { ...row, status } : row,
            ),
          );
        } else {
          const paginated = value as PaginatedResponse<Inquiry>;
          queryClient.setQueryData(key, {
            ...paginated,
            data: paginated.data.map((row) =>
              row.id === id ? { ...row, status } : row,
            ),
          });
        }
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, value] of context.snapshots) {
          queryClient.setQueryData(key, value);
        }
      }
      toast.error(t("statusChangeFailed"));
    },
    onSuccess: (_, variables) => {
      invalidate();
      toast.success(
        variables.status === "archived"
          ? t("archived")
          : variables.status === "read"
            ? t("markedRead")
            : t("reopened"),
      );
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: InquiryStatus;
    }) => {
      await Promise.all(
        ids.map((id) =>
          apiClient(`/inquiries/${id}/status`, {
            method: "PATCH",
            body: { status },
          }),
        ),
      );
    },
    onSuccess: (_, variables) => {
      invalidate();
      toast.success(
        variables.status === "archived" ? t("archived") : t("markedRead"),
      );
      list.clearSelection();
    },
    onError: () => toast.error(t("statusChangeFailed")),
  });

  const openInquiry = (inq: Inquiry) => {
    if (inq.status === "new") {
      statusMutation.mutate({ id: inq.id, status: "read" });
      // Reflect the read status in the sheet header immediately — otherwise its
      // own badge stayed "NOU" until the sheet was reopened (BUG-112). The row
      // badge already updates via the list refetch; this keeps the sheet in sync.
      setViewing({ ...inq, status: "read" });
    } else {
      setViewing(inq);
    }
  };

  const columns: ColumnDef<Inquiry, unknown>[] = [
    {
      id: "status",
      header: t("columnStatus"),
      enableSorting: false,
      size: 96,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "name",
      header: t("columnContact"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p
            className={
              row.original.status === "new"
                ? "truncate text-sm font-semibold text-foreground"
                : "truncate text-sm font-medium text-foreground"
            }
          >
            {row.original.name}
          </p>
          <Mono className="truncate text-[11px] text-muted-foreground">
            {row.original.email}
          </Mono>
        </div>
      ),
    },
    {
      id: "type",
      header: t("columnType"),
      enableSorting: false,
      cell: ({ row }) => (
        <MonoTag>{t(`typeLabel.${row.original.type}`)}</MonoTag>
      ),
    },
    {
      id: "message",
      header: t("columnMessage"),
      enableSorting: false,
      cell: ({ row }) => (
        <p className="max-w-[320px] truncate text-sm text-muted-foreground">
          {row.original.message}
        </p>
      ),
    },
    {
      id: "linked",
      header: t("columnLinked"),
      enableSorting: false,
      cell: ({ row }) => {
        // Prefer the joined property's localized title — much easier to grasp
        // at-a-glance than a slug. Fall back to entitySlug for non-property
        // inquiries (e.g. developer contact). Slug stays as a small mono ref
        // below the title so power users can still copy it for support.
        const property = row.original.property;
        if (property) {
          return (
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">
                {pickTitle(property.title, locale, property.slug)}
              </p>
              <Mono className="truncate text-[11px] text-muted-foreground">
                {property.slug}
              </Mono>
            </div>
          );
        }
        const slug =
          row.original.propertySlug ?? row.original.entitySlug ?? null;
        if (!slug) return <Mono>—</Mono>;
        return <Mono className="text-foreground/80">{slug}</Mono>;
      },
    },
    {
      id: "source",
      header: t("columnSource"),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.source ? (
          <MonoTag>{row.original.source}</MonoTag>
        ) : (
          <Mono>—</Mono>
        ),
    },
    {
      id: "createdAt",
      header: t("columnReceived"),
      enableSorting: false,
      cell: ({ row }) => <RelativeTime value={row.original.createdAt} />,
    },
    {
      id: "actions",
      header: "",
      size: 120,
      enableSorting: false,
      cell: ({ row }) => {
        const inq = row.original;
        const transition =
          inq.status === "new"
            ? { label: t("markRead"), icon: CheckCheck, iconClass: "text-[var(--color-success)]", next: "read" as const }
            : inq.status === "read"
              ? { label: t("archive"), icon: Archive, iconClass: "text-muted-foreground", next: "archived" as const }
              : { label: t("reopen"), icon: Undo2, iconClass: "text-muted-foreground", next: "read" as const };
        const TransitionIcon = transition.icon;
        return (
          <RowActions
            onDelete={() => setDeleteId(inq.id)}
            permissions={{ delete: "inquiry.delete" }}
            extra={
              <Can action="inquiry.update">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={transition.label}
                      onClick={() =>
                        statusMutation.mutate({ id: inq.id, status: transition.next })
                      }
                    >
                      <TransitionIcon className={transition.iconClass} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{transition.label}</TooltipContent>
                </Tooltip>
              </Can>
            }
          />
        );
      },
    },
  ];

  const activeFilters =
    (statusFilter ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (trimmedSource ? 1 : 0);

  const viewToggle = (
    <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
      <button
        type="button"
        onClick={() => setView("list")}
        className={cn(
          "mono inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] uppercase tracking-[0.06em] transition-colors",
          view === "list"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <List className="h-3 w-3" />
        {t("viewList")}
      </button>
      <button
        type="button"
        onClick={() => setView("kanban")}
        className={cn(
          "mono inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] uppercase tracking-[0.06em] transition-colors",
          view === "kanban"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <KanbanSquare className="h-3 w-3" />
        {t("viewKanban")}
      </button>
    </div>
  );

  if (view === "kanban") {
    return (
      <>
        <div className="flex flex-col gap-4">
          <PageHeader title={effectiveTitle} actions={viewToggle} />
          <div className="flex min-h-0 gap-4">
            <div className="hidden lg:block">
              <FilterRail
                activeCount={activeFilters}
                onClear={() => {
                  setStatusFilter("");
                  setTypeFilter("");
                  setSourceFilter("");
                }}
              >
                <FilterGroup title={t("columnStatus")}>
                  {STATUSES.map((s) => (
                    <FilterCheckbox
                      key={s}
                      label={tc(
                        `statusLabel.${s}` as Parameters<typeof tc>[0],
                      )}
                      checked={statusFilter === s}
                      onChange={(checked) => setStatusFilter(checked ? s : "")}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup title={t("columnType")}>
                  {TYPES.map((ty) => (
                    <FilterCheckbox
                      key={ty}
                      label={t(`typeLabel.${ty}`)}
                      checked={typeFilter === ty}
                      onChange={(checked) => setTypeFilter(checked ? ty : "")}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup title={t("filterSource")}>
                  <Input
                    type="search"
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    placeholder={t("filterSourcePlaceholder")}
                    className="mono h-8 text-[12px]"
                  />
                </FilterGroup>
              </FilterRail>
            </div>
            <div className="min-w-0 flex-1">
              <InquiryKanbanBoard
                items={kanbanItems}
                isLoading={kanbanQuery.isLoading}
                isError={kanbanQuery.isError}
                onRetry={() => kanbanQuery.refetch()}
                onStatusChange={(id, status) =>
                  statusMutation.mutate({ id, status })
                }
                onOpen={(inq) => openInquiry(inq as Inquiry)}
              />
            </div>
          </div>
        </div>

        <InquiryPeekSheet
          viewing={viewing}
          onClose={() => setViewing(null)}
          onArchive={(id) => {
            statusMutation.mutate({ id, status: "archived" });
            setViewing(null);
          }}
          onReopen={(id) => {
            statusMutation.mutate({ id, status: "read" });
            setViewing(null);
          }}
        />
      </>
    );
  }

  return (
    <>
      <ResourceListPage<Inquiry>
        title={effectiveTitle}
        list={list}
        columns={columns}
        rowId={(row) => row.id}
        onRowClick={openInquiry}
        headerActions={viewToggle}
        activeFilters={activeFilters}
        filterRail={
          <FilterRail
            activeCount={activeFilters}
            onClear={() => {
              setStatusFilter("");
              setTypeFilter("");
              setSourceFilter("");
            }}
          >
            <FilterGroup title={t("columnStatus")}>
              {STATUSES.map((s) => (
                <FilterCheckbox
                  key={s}
                  label={tc(`statusLabel.${s}` as Parameters<typeof tc>[0])}
                  checked={statusFilter === s}
                  onChange={(checked) => setStatusFilter(checked ? s : "")}
                />
              ))}
            </FilterGroup>
            <FilterGroup title={t("columnType")}>
              {TYPES.map((ty) => (
                <FilterCheckbox
                  key={ty}
                  label={ty}
                  checked={typeFilter === ty}
                  onChange={(checked) => setTypeFilter(checked ? ty : "")}
                />
              ))}
            </FilterGroup>
            <FilterGroup title={t("filterSource")}>
              <Input
                type="search"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                placeholder={t("filterSourcePlaceholder")}
                className="mono h-8 text-[12px]"
              />
            </FilterGroup>
          </FilterRail>
        }
        bulkActions={(selection) => {
          const ids = Array.from(selection);
          return (
            <>
              <Can action="inquiry.update">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkStatusMutation.mutate({ ids, status: "read" })
                  }
                  disabled={bulkStatusMutation.isPending}
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  {t("markRead")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkStatusMutation.mutate({ ids, status: "archived" })
                  }
                  disabled={bulkStatusMutation.isPending}
                >
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                  {t("archive")}
                </Button>
              </Can>
              <Can action="inquiry.delete">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {tc("delete")}
                </Button>
              </Can>
            </>
          );
        }}
        mobileCard={(inq) => (
          <button
            type="button"
            onClick={() => openInquiry(inq)}
            className="card-hover block w-full space-y-2 rounded-md border border-border bg-card p-3 text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{inq.name}</p>
                <Mono className="truncate text-[11px]">{inq.email}</Mono>
              </div>
              <StatusBadge status={inq.status} />
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {inq.message}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <MonoTag>{t(`typeLabel.${inq.type}`)}</MonoTag>
              {inq.source && <MonoTag>{inq.source}</MonoTag>}
              <RelativeTime value={inq.createdAt} className="ml-auto" />
            </div>
          </button>
        )}
      />

      <InquiryPeekSheet
        viewing={viewing}
        onClose={() => setViewing(null)}
        onArchive={(id) => {
          statusMutation.mutate({ id, status: "archived" });
          setViewing(null);
        }}
        onReopen={(id) => {
          statusMutation.mutate({ id, status: "read" });
          setViewing(null);
        }}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("deleteTitle")}
        loading={deleteMutation.isPending}
      />

      <DeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(list.selection))}
        title={t("deleteTitle")}
        loading={bulkDeleteMutation.isPending}
      />
    </>
  );
}

interface PeekProps {
  viewing: Inquiry | null;
  onClose: () => void;
  onArchive: (id: string) => void;
  onReopen: (id: string) => void;
}

/**
 * Peek surface for an inquiry — detail-sheet pattern (right-side drawer,
 * portrait shape, labeled sections). Replaces the prior centered-Dialog
 * shape, which was wider than tall and rendered every datum unlabeled —
 * confusing for first-time readers (see Wave 3.8 in plan).
 */
function InquiryPeekSheet({
  viewing,
  onClose,
  onArchive,
  onReopen,
}: PeekProps) {
  const t = useTranslations("Inquiries");
  const tc = useTranslations("Common");
  const locale = useLocale();

  // Render an empty Sheet when nothing is being viewed so the slide-in/out
  // animation runs cleanly on close. The primitive's open prop drives state.
  const open = !!viewing;

  const subtitle = viewing && (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <a
        href={`mailto:${viewing.email}`}
        className="mono inline-flex items-center gap-1 text-copper hover:underline"
      >
        <Mail className="h-3 w-3" />
        {viewing.email}
      </a>
      {viewing.phone && (
        <>
          <span className="text-muted-foreground/40">·</span>
          <a
            href={`tel:${viewing.phone}`}
            className="mono inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Phone className="h-3 w-3" />
            {viewing.phone}
          </a>
        </>
      )}
    </span>
  );

  const footer = viewing && (
    <>
      <Can action="inquiry.update">
        {viewing.status !== "archived" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onArchive(viewing.id)}
          >
            <Archive className="mr-1.5 h-3.5 w-3.5" />
            {t("archive")}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReopen(viewing.id)}
          >
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
            {t("reopen")}
          </Button>
        )}
      </Can>
      <Button variant="outline" size="sm" onClick={onClose}>
        {tc("close")}
      </Button>
    </>
  );

  return (
    <DetailSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={viewing?.name ?? ""}
      subtitle={subtitle}
      status={viewing && <StatusBadge status={viewing.status} />}
      footer={footer}
    >
      {viewing && (
        <>
          {/*
            Details — type / received / source / budget. Two-column grid so
            each datum has its label on the left and value on the right; the
            first-time reader can't mistake what's what.
          */}
          <section className="border-b border-border py-3">
            <dl className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-2 text-sm">
              <dt className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("sectionLabel.type")}
              </dt>
              <dd>{t(`typeLabel.${viewing.type}`)}</dd>

              <dt className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("sectionLabel.received")}
              </dt>
              <dd>
                <RelativeTime value={viewing.createdAt} />
              </dd>

              <dt className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("sectionLabel.source")}
              </dt>
              <dd>
                {viewing.source ? (
                  <MonoTag>{viewing.source}</MonoTag>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>

              {viewing.budget && (
                <>
                  <dt className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("sectionLabel.budget")}
                  </dt>
                  <dd>{viewing.budget}</dd>
                </>
              )}
            </dl>
          </section>

          {/*
            Property — primary relation when present. Hidden entirely for
            general-type inquiries so we don't show an empty placeholder.
            Fallback for legacy rows with only a propertySlug (no joined
            property record) is to show the slug raw — same as before.
          */}
          {viewing.property ? (
            <DetailSheetSection label={t("sectionLabel.property")}>
              {/*
                Stack: title → slug → action. Each on its own line. `<Mono>`
                renders as a span (inline) and `<Link>` is inline-flex —
                without the flex-col parent + self-start on the link they
                collapse onto the same line, which reads as two glyphs glued
                together (the bug from screenshot 033906).
              */}
              <div className="flex flex-col items-start gap-1">
                <p className="font-medium">
                  {pickTitle(
                    viewing.property.title,
                    locale,
                    viewing.property.slug,
                  )}
                </p>
                <Mono className="text-[11px] text-muted-foreground">
                  {viewing.property.slug}
                </Mono>
                <Link
                  href={
                    // Cast: typed router doesn't infer dynamic segment templates.
                    `/properties/${viewing.property.id}` as Parameters<
                      typeof Link
                    >[0]["href"]
                  }
                  onClick={onClose}
                  className="mono mt-1 inline-flex items-center gap-1 text-[11px] text-copper hover:underline"
                >
                  {t("viewProperty")}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </DetailSheetSection>
          ) : viewing.propertySlug ? (
            <DetailSheetSection label={t("sectionLabel.property")}>
              <Mono className="text-foreground/80">{viewing.propertySlug}</Mono>
            </DetailSheetSection>
          ) : null}

          {/* Message — last because it can be long. Vertical scroll lives on
              the parent body (DetailSheet's content area), so even a multi-
              paragraph message stays readable without nested scrollbars. */}
          <DetailSheetSection label={t("sectionLabel.message")}>
            <div className="whitespace-pre-wrap leading-relaxed">
              {viewing.message}
            </div>
          </DetailSheetSection>

          {viewing.sourceUrl && (
            <DetailSheetSection label={t("sectionLabel.sourceUrl")}>
              <a
                href={viewing.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mono break-all text-[11px] text-muted-foreground hover:text-copper"
              >
                {viewing.sourceUrl}
              </a>
              {viewing.locale && (
                <span className="mono ml-2 inline-flex items-center rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {viewing.locale}
                </span>
              )}
            </DetailSheetSection>
          )}
        </>
      )}
    </DetailSheet>
  );
}
