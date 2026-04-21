"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tge/ui";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { useRouter } from "@/i18n/navigation";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { useAuth, usePermissions } from "@/components/auth/auth-provider";
import { useResourceList } from "@/hooks/use-resource-list";

import { buildUserColumns } from "./_components/columns";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { EditUserDialog } from "./_components/edit-user-dialog";
import type {
  AdminUser,
  AgentSummary,
  CreateUserPayload,
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

  const list = useResourceList<AdminUser>({
    resource: "users",
    endpoint: "/auth/users",
    defaultLimit: 100,
    enabled: can("users.manage"),
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
  const [editing, setEditing] = useState<AdminUser | null>(null);

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

  const columns = buildUserColumns({
    self,
    onEdit: setEditing,
    onDelete: (id) => setDeleteId(id),
    t: (k) => t(k as Parameters<typeof t>[0]),
    tc: (k) => tc(k as Parameters<typeof tc>[0]),
  });

  return (
    <>
      <ResourceListPage<AdminUser>
        title={t("title")}
        list={list}
        columns={columns}
        headerActions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("addUser")}
          </Button>
        }
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {t("addUser")}
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

      <EditUserDialog
        editing={editing}
        onClose={() => setEditing(null)}
        self={self}
        unlinkedAgents={unlinkedAgents}
        onSubmit={(payload) => updateMutation.mutate(payload)}
        isPending={updateMutation.isPending}
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
