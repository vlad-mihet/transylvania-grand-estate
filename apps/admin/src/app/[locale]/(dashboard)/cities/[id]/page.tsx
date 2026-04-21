"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import type { ApiCity } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@tge/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DetailView } from "@/components/shared/detail-view";
import { Can } from "@/components/shared/can";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { CityDetailView } from "@/components/cities/city-detail-view";
import { HistoryTab } from "@/components/audit/history-tab";

export default function CityViewPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("Cities");
  const tc = useTranslations("Common");

  return (
    <DetailPageShell<ApiCity>
      queryKey={["city", id]}
      queryFn={() => apiClient<ApiCity>(`/cities/id/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(city) => (
        <DetailView>
          <PageHeader
            title={city.name}
            actions={
              <>
                <EntityDeleteButton
                  apiPath={`/cities/${city.id ?? id}`}
                  permission="city.delete"
                  listHref="/cities"
                  invalidateKeys={[["cities"], ["city", city.id ?? id]]}
                  confirmTitle={t("deleteTitle")}
                  successMessage={t("deleted")}
                  errorMessage={t("deleteFailed")}
                />
                <Can action="city.update">
                  <Button asChild size="sm">
                    <Link href={`/cities/${city.id ?? id}/edit`}>
                      <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">{tc("edit")}</span>
                    </Link>
                  </Button>
                </Can>
              </>
            }
          />
          <CityDetailView city={city} />
          <Can action="audit-log.read">
            <HistoryTab resource="City" resourceId={city.id ?? id} />
          </Can>
        </DetailView>
      )}
    />
  );
}
