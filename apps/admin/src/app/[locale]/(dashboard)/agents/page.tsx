"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tge/ui";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { Avatar } from "@/components/shared/avatar";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Can } from "@/components/shared/can";
import { useResourceList } from "@/hooks/use-resource-list";

import { SORT_TOKENS, type Agent } from "./_components/account-status";
import { buildAgentColumns } from "./_components/columns";
import { InviteAgentDialog } from "./_components/invite-dialog";

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Agents");
  const ti = useTranslations("Invitations");
  const tc = useTranslations("Common");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<Agent | null>(null);

  const list = useResourceList<Agent>({
    resource: "agents",
    defaultSort: "name_asc",
    defaultLimit: 20,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/agents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiClient(`/agents/${id}`, { method: "DELETE" })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(t("deleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient(`/agents/${id}`, { method: "PATCH", body: { active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
    onError: () => {
      toast.error(tc("featuredError"));
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: (agentId: string) =>
      apiClient<{ emailDelivered: boolean }>(
        `/invitations/agents/${agentId}/invite`,
        { method: "POST", body: {} },
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      if (result.emailDelivered) {
        toast.success(ti("sendInviteSuccess"));
      } else {
        toast.warning(ti("resendEmailFailed"));
      }
      setInviteTarget(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : ti("sendInviteFailed"));
      setInviteTarget(null);
    },
  });

  const columns = buildAgentColumns({
    onToggleActive: toggleActive.mutate,
    onDelete: (id) => setDeleteId(id),
    onInvite: setInviteTarget,
    t: (k) => t(k as Parameters<typeof t>[0]),
    ti: (k) => ti(k as Parameters<typeof ti>[0]),
    tc: (k) => tc(k as Parameters<typeof tc>[0]),
  });

  return (
    <>
      <ResourceListPage<Agent>
        title={t("title")}
        createHref="/agents/invite"
        createLabel={ti("inviteAgent")}
        createAction="agent.create"
        list={list}
        columns={columns}
        sortTokens={SORT_TOKENS}
        sortOptions={[
          { value: "name_asc", label: tc("sortNameAsc") },
          { value: "name_desc", label: tc("sortNameDesc") },
          { value: "newest", label: tc("sortNewest") },
          { value: "oldest", label: tc("sortOldest") },
          { value: "active", label: tc("sortActive") },
        ]}
        emptyAction={
          <Can action="agent.create">
            <Button asChild size="sm">
              <Link href="/agents/invite">{ti("inviteAgent")}</Link>
            </Button>
          </Can>
        }
        bulkActions={() => (
          <Can action="agent.delete">
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
        )}
        mobileCard={(agent) => (
          <Link
            href={`/agents/${agent.id}`}
            className="card-hover block space-y-2 rounded-md border border-border bg-card p-3"
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={agent.photo}
                alt={`${agent.firstName} ${agent.lastName}`}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {agent.firstName} {agent.lastName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {agent.email}
                </p>
              </div>
              <StatusBadge status={agent.active ? "active" : "inactive"} />
            </div>
          </Link>
        )}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        loading={deleteMutation.isPending}
      />

      <DeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(list.selection))}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        loading={bulkDeleteMutation.isPending}
      />

      <InviteAgentDialog
        target={inviteTarget}
        onClose={() => setInviteTarget(null)}
        onConfirm={(id) => sendInviteMutation.mutate(id)}
        isPending={sendInviteMutation.isPending}
      />
    </>
  );
}
