"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, PowerOff, Power } from "lucide-react";
import type { ApiAgent } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@tge/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DetailView } from "@/components/shared/detail-view";
import { Can } from "@/components/shared/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { AgentDetailView } from "@/components/agents/agent-detail-view";
import { HistoryTab } from "@/components/audit/history-tab";
import { AccessTab } from "./_components/access-tab";

export default function AgentViewPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("Agents");
  const tc = useTranslations("Common");
  const tt = useTranslations("People.agentDetail.tabs");
  const queryClient = useQueryClient();
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const toggleActive = useMutation({
    mutationFn: ({ agentId, active }: { agentId: string; active: boolean }) =>
      apiClient(`/agents/${agentId}`, {
        method: "PATCH",
        body: { active },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent", variables.agentId] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(variables.active ? t("activated") : t("deactivated"));
      setDeactivateOpen(false);
    },
    onError: () => toast.error(t("statusChangeFailed")),
  });

  return (
    <DetailPageShell<ApiAgent>
      queryKey={["agent", id]}
      queryFn={() => apiClient<ApiAgent>(`/agents/id/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(agent) => (
        <DetailView>
          <PageHeader
            title={`${agent.firstName} ${agent.lastName}`.trim()}
            actions={
              <>
                <Can action="agent.update">
                  {agent.active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeactivateOpen(true)}
                      disabled={toggleActive.isPending}
                    >
                      <PowerOff className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">
                        {t("deactivateAction")}
                      </span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleActive.mutate({
                          agentId: agent.id,
                          active: true,
                        })
                      }
                      disabled={toggleActive.isPending}
                    >
                      <Power className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">
                        {t("activateAction")}
                      </span>
                    </Button>
                  )}
                </Can>
                <EntityDeleteButton
                  apiPath={`/agents/${agent.id}`}
                  permission="agent.delete"
                  listHref="/people/agents"
                  invalidateKeys={[["agents"], ["agent", agent.id]]}
                  confirmTitle={t("deleteTitle")}
                  confirmDescription={t("deleteDescription")}
                  successMessage={t("deleted")}
                  errorMessage={t("deleteFailed")}
                />
                <Can action="agent.update">
                  <Button asChild size="sm">
                    <Link href={`/people/agents/${agent.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">{tc("edit")}</span>
                    </Link>
                  </Button>
                </Can>
              </>
            }
          />
          <Tabs defaultValue="access">
            <TabsList>
              <TabsTrigger value="access">{tt("access")}</TabsTrigger>
              <TabsTrigger value="publicProfile">
                {tt("publicProfile")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="access" className="mt-4">
              <AccessTab agent={agent} />
            </TabsContent>
            <TabsContent
              value="publicProfile"
              className="mt-4 flex flex-col gap-5"
            >
              <AgentDetailView agent={agent} />
              <Can action="audit-log.read">
                <HistoryTab resource="Agent" resourceId={agent.id} />
              </Can>
            </TabsContent>
          </Tabs>
          <ConfirmDialog
            open={deactivateOpen}
            onOpenChange={setDeactivateOpen}
            onConfirm={() =>
              toggleActive.mutate({ agentId: agent.id, active: false })
            }
            title={t("deactivateConfirmTitle")}
            description={t("deactivateConfirmDescription")}
            confirmLabel={t("deactivateAction")}
            loading={toggleActive.isPending}
            tone="destructive"
          />
        </DetailView>
      )}
    />
  );
}
