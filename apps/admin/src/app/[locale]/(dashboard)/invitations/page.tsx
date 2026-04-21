"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@tge/ui";
import { Loader2, Send, XCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  FilterCheckbox,
  FilterGroup,
  FilterRail,
} from "@/components/shared/filter-rail";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { usePermissions } from "@/components/auth/auth-provider";
import { useResourceList } from "@/hooks/use-resource-list";

type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED"
  | "BOUNCED";

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedVia: string | null;
  emailSentAt: string | null;
  createdAt: string;
  agent: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
  } | null;
  invitedBy: { id: string; name: string; email: string } | null;
}

const STATUSES: InvitationStatus[] = [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
  "BOUNCED",
];

const STATUS_TONE: Record<
  InvitationStatus,
  "success" | "info" | "warning" | "neutral" | "danger"
> = {
  PENDING: "warning",
  ACCEPTED: "success",
  EXPIRED: "neutral",
  REVOKED: "neutral",
  BOUNCED: "danger",
};

const STATUS_KEY: Record<
  InvitationStatus,
  | "statusPending"
  | "statusAccepted"
  | "statusExpired"
  | "statusRevoked"
  | "statusBounced"
> = {
  PENDING: "statusPending",
  ACCEPTED: "statusAccepted",
  EXPIRED: "statusExpired",
  REVOKED: "statusRevoked",
  BOUNCED: "statusBounced",
};

export default function InvitationsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const qc = useQueryClient();
  const t = useTranslations("Invitations");
  const tc = useTranslations("Common");

  useEffect(() => {
    if (!can("users.manage")) router.replace("/403");
  }, [can, router]);

  const [statusFilter, setStatusFilter] = useState<InvitationStatus | "">("");
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const list = useResourceList<InvitationRow>({
    resource: "invitations",
    endpoint: "/invitations",
    defaultLimit: 20,
    extraParams: {
      status: statusFilter ? statusFilter.toLowerCase() : undefined,
    },
    enabled: can("users.manage"),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<{ emailDelivered: boolean; email?: string }>(
        `/invitations/${id}/resend`,
        { method: "POST" },
      ),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      if (result.emailDelivered) {
        toast.success(t("resendSuccess"));
      } else {
        toast.warning(t("resendEmailFailed"));
      }
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : t("resendFailed")),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/invitations/${id}/revoke`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      toast.success(t("revokeSuccess"));
      setRevokeId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("revokeFailed"));
      setRevokeId(null);
    },
  });

  const columns: ColumnDef<InvitationRow, unknown>[] = [
    {
      id: "email",
      header: t("columnEmail"),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.agent
              ? `${row.original.agent.firstName} ${row.original.agent.lastName}`
              : row.original.email}
          </p>
          <Mono className="truncate text-[11px] text-muted-foreground">
            {row.original.email}
          </Mono>
        </div>
      ),
    },
    {
      id: "status",
      header: t("columnStatus"),
      size: 140,
      enableSorting: false,
      cell: ({ row }) => (
        <StatusBadge
          status={t(STATUS_KEY[row.original.status])}
          tone={STATUS_TONE[row.original.status]}
        />
      ),
    },
    {
      id: "expiresAt",
      header: t("columnExpires"),
      size: 140,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.status === "ACCEPTED" && row.original.acceptedAt ? (
          <Mono className="text-muted-foreground">
            <RelativeTime value={row.original.acceptedAt} />
          </Mono>
        ) : (
          <RelativeTime value={row.original.expiresAt} />
        ),
    },
    {
      id: "invitedBy",
      header: t("columnInvitedBy"),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.invitedBy ? (
          <span className="truncate text-sm text-foreground/80">
            {row.original.invitedBy.name}
          </span>
        ) : (
          <Mono className="text-muted-foreground">\u2014</Mono>
        ),
    },
    {
      id: "createdAt",
      header: tc("columnCreated"),
      size: 120,
      enableSorting: false,
      cell: ({ row }) => <RelativeTime value={row.original.createdAt} />,
    },
    {
      id: "actions",
      header: "",
      size: 170,
      enableSorting: false,
      cell: ({ row }) => {
        const canResend =
          row.original.status === "PENDING" ||
          row.original.status === "EXPIRED" ||
          row.original.status === "REVOKED";
        const canRevoke = row.original.status === "PENDING";
        return (
          <div
            className="flex justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {canResend && (
              <Button
                variant="outline"
                size="sm"
                disabled={
                  resendMutation.isPending &&
                  resendMutation.variables === row.original.id
                }
                onClick={() => resendMutation.mutate(row.original.id)}
              >
                {resendMutation.isPending &&
                resendMutation.variables === row.original.id ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-3 w-3" />
                )}
                {t("resend")}
              </Button>
            )}
            {canRevoke && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive/70 hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                onClick={() => setRevokeId(row.original.id)}
              >
                <XCircle className="mr-1.5 h-3 w-3" />
                {t("revoke")}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const activeFilters = statusFilter ? 1 : 0;

  return (
    <>
      <ResourceListPage<InvitationRow>
        title={t("listTitle")}
        description={t("listDescription")}
        list={list}
        columns={columns}
        rowId={(row) => row.id}
        activeFilters={activeFilters}
        filterRail={
          <FilterRail
            activeCount={activeFilters}
            onClear={() => setStatusFilter("")}
          >
            <FilterGroup title={t("columnStatus")}>
              {STATUSES.map((s) => (
                <FilterCheckbox
                  key={s}
                  label={t(STATUS_KEY[s])}
                  checked={statusFilter === s}
                  onChange={(checked) => setStatusFilter(checked ? s : "")}
                />
              ))}
            </FilterGroup>
          </FilterRail>
        }
        emptyTitle={tc("emptyTitle")}
        emptyDescription={t("empty")}
      />
      <DeleteDialog
        open={!!revokeId}
        onOpenChange={() => setRevokeId(null)}
        onConfirm={() => revokeId && revokeMutation.mutate(revokeId)}
        title={t("revokeTitle")}
        description={t("revokeDescription")}
        loading={revokeMutation.isPending}
      />
    </>
  );
}
