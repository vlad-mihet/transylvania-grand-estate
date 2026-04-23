"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { Send, XCircle } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Can } from "@/components/shared/can";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  FilterRail,
  FilterGroup,
  FilterCheckbox,
} from "@/components/shared/filter-rail";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { useResourceList } from "@/hooks/use-resource-list";
import { pickTitle } from "@/lib/academy/pick-title";

type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED"
  | "BOUNCED";

type Invitation = {
  id: string;
  email: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedVia: string | null;
  emailSentAt: string | null;
  emailAttempts: number;
  bouncedAt: string | null;
  bounceReason: string | null;
  createdAt: string;
  initialCourse: {
    id: string;
    slug: string;
    title: Record<string, string | undefined>;
  } | null;
};

type StatusFilter = "pending" | "accepted" | "expired" | "revoked" | "bounced";

const STATUS_VALUES: StatusFilter[] = [
  "pending",
  "accepted",
  "expired",
  "revoked",
  "bounced",
];

export default function AcademyInvitationsPage() {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("Academy.invitations");
  const tInvStatus = useTranslations("Academy.invitationStatuses");
  const tt = useTranslations("Academy.toasts");

  // The invitations API takes `email` (not `search`) as its text filter.
  // Bind the same `q` nuqs key that useResourceList uses so the SearchInput
  // (which writes `q`) feeds this value transparently, while useResourceList's
  // own `search` → `search=` round-trip remains harmless (server ignores it).
  const [emailSearch] = useQueryState("q", parseAsString.withDefault(""));

  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(
    () => new Set(),
  );
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [bulkRevokeOpen, setBulkRevokeOpen] = useState(false);

  const statusParam =
    statusFilters.size === 1 ? Array.from(statusFilters)[0] : undefined;

  const list = useResourceList<Invitation>({
    resource: "academy-invitations",
    endpoint: "/admin/academy/invitations",
    defaultLimit: 25,
    extraParams: {
      email: emailSearch.trim() || undefined,
      status: statusParam,
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/academy/invitations/${id}/resend`, {
        method: "POST",
        body: {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-invitations"] });
      toast.success(tt("invitationResent"));
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("invitationResendFailed"),
      ),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/academy/invitations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-invitations"] });
      toast.success(tt("invitationRevoked"));
      setRevokeId(null);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("invitationRevokeFailed"),
      ),
  });

  const bulkRevokeMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          apiClient(`/admin/academy/invitations/${id}`, { method: "DELETE" }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-invitations"] });
      toast.success(tt("invitationRevoked"));
      list.clearSelection();
      setBulkRevokeOpen(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("invitationRevokeFailed"),
      ),
  });

  const toggleStatus = (status: StatusFilter) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const columns: ColumnDef<Invitation, unknown>[] = [
    {
      id: "email",
      header: t("columnEmail"),
      cell: ({ row }) => (
        <Mono className="text-foreground">{row.original.email}</Mono>
      ),
    },
    {
      id: "status",
      header: t("columnStatus"),
      cell: ({ row }) => (
        <div>
          <StatusBadge status={row.original.status.toLowerCase()} />
          {row.original.bouncedAt ? (
            <p className="mt-1 text-[11px] text-[var(--color-danger)]">
              {t("bouncedSuffix", {
                reason:
                  row.original.bounceReason ?? t("bouncedReasonUnknown"),
              })}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "course",
      header: t("columnCourse"),
      cell: ({ row }) =>
        row.original.initialCourse ? (
          <span className="text-xs text-foreground/80">
            {pickTitle(
              row.original.initialCourse.title,
              row.original.initialCourse.slug,
              locale,
            )}
          </span>
        ) : (
          <Mono className="text-muted-foreground">{t("wildcard")}</Mono>
        ),
    },
    {
      id: "createdAt",
      header: t("columnCreated"),
      cell: ({ row }) => <RelativeTime value={row.original.createdAt} />,
    },
    {
      id: "expiresAt",
      header: t("columnExpires"),
      cell: ({ row }) => <RelativeTime value={row.original.expiresAt} />,
    },
    {
      id: "actions",
      header: "",
      size: 112,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.status !== "ACCEPTED" ? (
          <Can action="academy.user.manage">
            <div className="inline-flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  resendMutation.mutate(row.original.id);
                }}
                disabled={resendMutation.isPending}
                aria-label={t("resendAria", { email: row.original.email })}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-[var(--color-danger)]"
                onClick={(e) => {
                  e.stopPropagation();
                  setRevokeId(row.original.id);
                }}
                aria-label={t("revokeAria", { email: row.original.email })}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Can>
        ) : null,
    },
  ];

  return (
    <>
      <ResourceListPage<Invitation>
        title={t("listTitle")}
        description={t("listDescription")}
        list={list}
        columns={columns}
        searchPlaceholder={t("searchPlaceholder")}
        activeFilters={statusFilters.size}
        filterRail={
          <FilterRail
            activeCount={statusFilters.size}
            onClear={() => setStatusFilters(new Set())}
          >
            <FilterGroup title={t("columnStatus")}>
              {STATUS_VALUES.map((s) => (
                <FilterCheckbox
                  key={s}
                  label={tInvStatus(s)}
                  checked={statusFilters.has(s)}
                  onChange={() => toggleStatus(s)}
                />
              ))}
            </FilterGroup>
          </FilterRail>
        }
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
        bulkActions={(selection) => (
          <Can action="academy.user.manage">
            <Button
              variant="outline"
              size="sm"
              className="text-[var(--color-danger)] border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] hover:bg-[var(--color-danger-bg)]"
              onClick={() => setBulkRevokeOpen(true)}
              disabled={selection.size === 0}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              {t("bulkRevoke")}
            </Button>
          </Can>
        )}
      />

      <DeleteDialog
        open={!!revokeId}
        onOpenChange={(open) => !open && setRevokeId(null)}
        onConfirm={() => revokeId && revokeMutation.mutate(revokeId)}
        title={t("revokeTitle")}
        description={t("revokeDescription")}
        loading={revokeMutation.isPending}
      />

      <DeleteDialog
        open={bulkRevokeOpen}
        onOpenChange={setBulkRevokeOpen}
        onConfirm={() =>
          bulkRevokeMutation.mutate(Array.from(list.selection))
        }
        title={t("bulkRevokeTitle", { count: list.selection.size })}
        loading={bulkRevokeMutation.isPending}
      />
    </>
  );
}
