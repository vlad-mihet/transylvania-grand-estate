"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tge/ui";
import { Mail, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { useRouter } from "@/i18n/navigation";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { useAuth, usePermissions } from "@/components/auth/auth-provider";
import { useResourceList } from "@/hooks/use-resource-list";
import type { AdminRole } from "@/lib/permissions";

import { buildUserColumns } from "./_components/columns";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { EditUserDialog } from "./_components/edit-user-dialog";
import { InviteUserDialog } from "./_components/invite-user-dialog";
import { UserPeekSheet } from "./_components/user-peek-sheet";
import { UserFilterRail } from "./_components/role-filter-rail";
import { UsersBulkActions } from "./_components/bulk-actions";
import type { AdminUserStatus } from "./_components/constants";
import type {
  AdminUser,
  AgentSummary,
  BulkActionPayload,
  CreateUserPayload,
  InviteUserPayload,
  UpdateUserPayload,
} from "./_components/types";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("Users");
  const tc = useTranslations("Common");
  const { user: self } = useAuth();
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("users.manage")) router.replace("/403");
  }, [can, router]);

  const [roleFilters, setRoleFilters] = useState<ReadonlyArray<AdminRole>>([]);
  const [statusFilters, setStatusFilters] = useState<
    ReadonlyArray<AdminUserStatus>
  >([]);

  const list = useResourceList<AdminUser>({
    resource: "users",
    endpoint: "/auth/users",
    defaultLimit: 100,
    enabled: can("users.manage"),
    extraParams: {
      role: roleFilters,
      status: statusFilters,
    },
  });

  // Unlinked-agents pool feeds both create + edit dialogs.
  const unlinkedAgentsQuery = useQuery({
    queryKey: ["agents-unlinked"],
    queryFn: () =>
      apiClient<AgentSummary[]>("/agents?unlinked=true&limit=200"),
    enabled: can("users.manage"),
    staleTime: 30_000,
  });
  const unlinkedAgents = useMemo<AgentSummary[]>(
    () =>
      Array.isArray(unlinkedAgentsQuery.data) ? unlinkedAgentsQuery.data : [],
    [unlinkedAgentsQuery.data],
  );

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["agents-unlinked"] });
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateUserPayload) => {
      const payload: Record<string, unknown> = {
        email: dto.email,
        name: dto.name,
        password: dto.password,
        role: dto.role,
      };
      if (dto.role === "AGENT" && dto.agentId) payload.agentId = dto.agentId;
      return apiClient("/auth/register", { method: "POST", body: payload });
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("created"));
      setCreateOpen(false);
    },
    onError: (err) => toast.error(err.message || t("createFailed")),
  });

  const inviteMutation = useMutation({
    mutationFn: (dto: InviteUserPayload) =>
      apiClient("/invitations/users", { method: "POST", body: dto }),
    onSuccess: () => {
      invalidate();
      toast.success(t("inviteSentToast"));
      setInviteOpen(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : t("inviteFailed"),
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateUserPayload) => {
      const body: Record<string, unknown> = {};
      if (payload.name !== undefined) body.name = payload.name;
      if (payload.role !== undefined) body.role = payload.role;
      if (payload.agentId !== undefined) body.agentId = payload.agentId;
      return apiClient(`/auth/users/${payload.id}`, { method: "PATCH", body });
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("updated"));
      setEditing(null);
    },
    onError: (err) => toast.error(err.message || t("updateFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/auth/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message || t("deleteFailed")),
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: BulkActionPayload) =>
      apiClient<{
        action: BulkActionPayload["action"];
        successCount: number;
        failureCount: number;
      }>("/auth/users/bulk", { method: "POST", body: payload }),
    onSuccess: (res) => {
      invalidate();
      list.clearSelection();
      // The server returns per-id outcomes so a partial success surfaces
      // both numbers in a single toast — no exception thrown for partials.
      if (res.failureCount === 0) {
        toast.success(t("bulkAppliedToast", { count: res.successCount }));
      } else {
        toast.error(
          t("bulkPartialToast", {
            ok: res.successCount,
            fail: res.failureCount,
          }),
        );
      }
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t("bulkFailed")),
  });

  const columns = buildUserColumns({
    self,
    onEdit: setEditing,
    onDelete: (id) => setDeleteId(id),
    onPeek: (user) => setPeekId(user.id),
    t: (k) => t(k as Parameters<typeof t>[0]),
    tc: (k) => tc(k as Parameters<typeof tc>[0]),
  });

  const toggleRole = (role: AdminRole) =>
    setRoleFilters((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  const toggleStatus = (status: AdminUserStatus) =>
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  const clearFilters = () => {
    setRoleFilters([]);
    setStatusFilters([]);
  };

  return (
    <>
      <ResourceListPage<AdminUser>
        title={t("title")}
        list={list}
        columns={columns}
        filterRail={
          <UserFilterRail
            selectedRoles={roleFilters}
            selectedStatuses={statusFilters}
            onRoleToggle={toggleRole}
            onStatusToggle={toggleStatus}
            onClear={clearFilters}
          />
        }
        activeFilters={roleFilters.length + statusFilters.length}
        bulkActions={(selection) => (
          <UsersBulkActions
            ids={Array.from(selection)}
            selfId={self?.id ?? null}
            onRun={(payload) => bulkMutation.mutate(payload)}
            isPending={bulkMutation.isPending}
          />
        )}
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
              title={t("addWithPasswordHint")}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("addWithPassword")}
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Mail className="mr-1 h-3.5 w-3.5" />
              {t("inviteUser")}
            </Button>
          </div>
        }
        emptyAction={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            {t("inviteUser")}
          </Button>
        }
        searchPlaceholder={t("searchPlaceholder")}
      />

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        unlinkedAgents={unlinkedAgents}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isPending={createMutation.isPending}
      />

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={(payload) => inviteMutation.mutate(payload)}
        isPending={inviteMutation.isPending}
      />

      <EditUserDialog
        editing={editing}
        onClose={() => setEditing(null)}
        self={self}
        unlinkedAgents={unlinkedAgents}
        onSubmit={(payload) => updateMutation.mutate(payload)}
        isPending={updateMutation.isPending}
      />

      <UserPeekSheet
        userId={peekId}
        self={self}
        onOpenChange={(open) => !open && setPeekId(null)}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
