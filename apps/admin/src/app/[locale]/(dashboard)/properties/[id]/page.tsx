"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import type { ApiProperty, ApiPropertyImage } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@tge/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DetailView } from "@/components/shared/detail-view";
import { Can } from "@/components/shared/can";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { type GalleryImage } from "@/components/shared/image-gallery-manager";
import { PropertyGalleryView } from "@/components/properties/property-gallery-view";
import { PropertyDetailView } from "@/components/properties/property-detail-view";
import { HistoryTab } from "@/components/audit/history-tab";

export default function PropertyViewPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("Properties");
  const tc = useTranslations("Common");
  const locale = useLocale();

  return (
    <DetailPageShell<ApiProperty>
      queryKey={["property", id]}
      queryFn={() => apiClient<ApiProperty>(`/properties/id/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(property) => {
        const localizedTitle =
          (property.title as Record<string, string>)[locale] ?? property.title.en;

        const galleryImages: GalleryImage[] = (property.images ?? []).map(
          (img: ApiPropertyImage) => ({
            id: img.id,
            src: img.src,
            alt:
              typeof img.alt === "string"
                ? img.alt
                : (img.alt as Record<string, string> | null)?.[locale] ??
                  (img.alt as Record<string, string> | null)?.en ??
                  "",
            isHero: img.isHero ?? false,
          }),
        );

        return (
          <DetailView>
            <PageHeader
              title={localizedTitle}
              actions={
                <>
                  <EntityDeleteButton
                    apiPath={`/properties/${property.id}`}
                    permission="property.delete"
                    resource={property}
                    listHref="/properties"
                    invalidateKeys={[["properties"], ["property", property.id]]}
                    confirmTitle={t("deleteTitle")}
                    confirmDescription={t("deleteDescription")}
                    successMessage={t("deleted")}
                    errorMessage={t("deleteFailed")}
                  />
                  <Can action="property.update" resource={property}>
                    <Button asChild size="sm">
                      <Link href={`/properties/${property.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">{tc("edit")}</span>
                      </Link>
                    </Button>
                  </Can>
                </>
              }
            />
            <PropertyGalleryView images={galleryImages} />
            <PropertyDetailView property={property} />
            <Can action="audit-log.read">
              <HistoryTab resource="Property" resourceId={property.id} />
            </Can>
          </DetailView>
        );
      }}
    />
  );
}
