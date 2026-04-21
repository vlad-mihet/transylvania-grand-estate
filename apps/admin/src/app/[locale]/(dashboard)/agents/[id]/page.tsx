"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import type { ApiAgent } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@tge/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DetailView } from "@/components/shared/detail-view";
import { Can } from "@/components/shared/can";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { AgentDetailView } from "@/components/agents/agent-detail-view";
import { HistoryTab } from "@/components/audit/history-tab";

export default function AgentViewPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("Agents");
  const tc = useTranslations("Common");

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
                <EntityDeleteButton
                  apiPath={`/agents/${agent.id}`}
                  permission="agent.delete"
                  listHref="/agents"
                  invalidateKeys={[["agents"], ["agent", agent.id]]}
                  confirmTitle={t("deleteTitle")}
                  confirmDescription={t("deleteDescription")}
                  successMessage={t("deleted")}
                  errorMessage={t("deleteFailed")}
                />
                <Can action="agent.update">
                  <Button asChild size="sm">
                    <Link href={`/agents/${agent.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">{tc("edit")}</span>
                    </Link>
                  </Button>
                </Can>
              </>
            }
          />
          <AgentDetailView agent={agent} />
          <Can action="audit-log.read">
            <HistoryTab resource="Agent" resourceId={agent.id} />
          </Can>
        </DetailView>
      )}
    />
  );
}
