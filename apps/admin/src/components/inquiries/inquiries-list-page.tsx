"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tge/ui";
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
import { useTranslations } from "next-intl";
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
  budget?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
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

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<InquiryType | "">("");
  const [viewing, setViewing] = useState<Inquiry | null>(null);
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum<"list" | "kanban">(["list", "kanban"]).withDefault("list"),
  );

  const effectiveTitle = title ?? t("title");

  const list = useResourceList<Inquiry>({
    resource: "inquiries",
    defaultLimit: 20,
    extraParams: {
      status: statusFilter || undefined,
      type: typeFilter || undefined,
    },
    enabled: view === "list",
  });

  const kanbanQuery = useQuery({
    queryKey: [
      "inquiries-kanban",
      { type: typeFilter || undefined, status: statusFilter || undefined },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/inquiries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiClient(`/inquiries/${id}`, { method: "DELETE" })),
      );
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("deleted"));
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
    setViewing(inq);
    if (inq.status === "new") {
      statusMutation.mutate({ id: inq.id, status: "read" });
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
      cell: ({ row }) => <MonoTag>{row.original.type}</MonoTag>,
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

  const activeFilters = (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0);

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
                      label={ty}
                      checked={typeFilter === ty}
                      onChange={(checked) => setTypeFilter(checked ? ty : "")}
                    />
                  ))}
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

        <InquiryPeekDialog
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
              <MonoTag>{inq.type}</MonoTag>
              {inq.source && <MonoTag>{inq.source}</MonoTag>}
              <RelativeTime value={inq.createdAt} className="ml-auto" />
            </div>
          </button>
        )}
      />

      <InquiryPeekDialog
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

function InquiryPeekDialog({
  viewing,
  onClose,
  onArchive,
  onReopen,
}: PeekProps) {
  const t = useTranslations("Inquiries");
  const tc = useTranslations("Common");

  return (
    <Dialog open={!!viewing} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {viewing && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle>{viewing.name}</DialogTitle>
                  <DialogDescription>
                    <a
                      href={`mailto:${viewing.email}`}
                      className="mono inline-flex items-center gap-1 text-copper hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      {viewing.email}
                    </a>
                    {viewing.phone && (
                      <>
                        <span className="mx-2 text-muted-foreground/40">·</span>
                        <a
                          href={`tel:${viewing.phone}`}
                          className="mono inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Phone className="h-3 w-3" />
                          {viewing.phone}
                        </a>
                      </>
                    )}
                  </DialogDescription>
                </div>
                <StatusBadge status={viewing.status} />
              </div>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-1.5 border-y border-border py-2">
              <MonoTag>{viewing.type}</MonoTag>
              {viewing.source && <MonoTag>{viewing.source}</MonoTag>}
              {viewing.propertySlug && (
                <Mono className="text-foreground/80">
                  {viewing.propertySlug}
                </Mono>
              )}
              {viewing.budget && (
                <Mono className="text-muted-foreground">{viewing.budget}</Mono>
              )}
              <RelativeTime value={viewing.createdAt} className="ml-auto" />
            </div>
            <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm text-foreground">
              {viewing.message}
            </div>
            {viewing.sourceUrl && (
              <a
                href={viewing.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mono truncate text-[11px] text-muted-foreground hover:text-copper"
              >
                {viewing.sourceUrl}
              </a>
            )}
            <DialogFooter>
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
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
