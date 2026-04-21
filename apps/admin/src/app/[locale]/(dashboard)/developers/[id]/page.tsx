"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import type { ApiDeveloper } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@tge/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DetailView } from "@/components/shared/detail-view";
import { Can } from "@/components/shared/can";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { DeveloperDetailView } from "@/components/developers/developer-detail-view";
import { HistoryTab } from "@/components/audit/history-tab";

export default function DeveloperViewPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("Developers");
  const tc = useTranslations("Common");

  return (
    <DetailPageShell<ApiDeveloper>
      queryKey={["developer", id]}
      queryFn={() => apiClient<ApiDeveloper>(`/developers/id/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(developer) => (
        <DetailView>
          <PageHeader
            title={developer.name}
            actions={
              <>
                <EntityDeleteButton
                  apiPath={`/developers/${developer.id}`}
                  permission="developer.delete"
                  listHref="/developers"
                  invalidateKeys={[["developers"], ["developer", developer.id]]}
                  confirmTitle={t("deleteTitle")}
                  successMessage={t("deleted")}
                  errorMessage={t("deleteFailed")}
                />
                <Can action="developer.update">
                  <Button asChild size="sm">
                    <Link href={`/developers/${developer.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">{tc("edit")}</span>
                    </Link>
                  </Button>
                </Can>
              </>
            }
          />
          <DeveloperDetailView developer={developer} />
          <Can action="audit-log.read">
            <HistoryTab resource="Developer" resourceId={developer.id} />
          </Can>
        </DetailView>
      )}
    />
  );
}
