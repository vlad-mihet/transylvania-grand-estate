"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ApiProperty, ApiPropertyImage } from "@tge/types";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { PropertyForm } from "@/components/forms/property-form";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { PropertyFormValues } from "@/lib/validations/property";
import { toPropertyPayload } from "@/lib/transform-property";
import { GalleryImage } from "@/components/shared/image-gallery-manager";

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Properties");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("property.update")) router.replace("/403");
  }, [can, router]);

  const updateMutation = useMutation({
    mutationFn: async ({
      data,
      images,
    }: {
      data: PropertyFormValues;
      images: GalleryImage[];
    }) => {
      await apiClient(`/properties/${id}`, {
        method: "PATCH",
        body: toPropertyPayload(data),
      });

      const newImages = images.filter((img) => img.file);
      if (newImages.length > 0) {
        const formData = new FormData();
        newImages.forEach((img) => {
          if (img.file) formData.append("images", img.file);
        });
        try {
          await apiClient(`/properties/${id}/images`, {
            method: "POST",
            body: formData,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success(t("updated"));
      router.push(`/properties/${id}`);
    },
  });

  if (!can("property.update")) return null;

  return (
    <DetailPageShell<ApiProperty>
      queryKey={["property", id]}
      queryFn={() => apiClient<ApiProperty>(`/properties/id/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(property) => {
        const defaultValues: Partial<PropertyFormValues> = {
          title: property.title,
          description: property.description,
          shortDescription: property.shortDescription,
          slug: property.slug,
          price: property.price,
          currency: property.currency,
          type: property.type,
          status: property.status,
          city: property.city,
          citySlug: property.citySlug,
          neighborhood: property.neighborhood ?? "",
          address: property.address ?? { en: "", ro: "" },
          latitude: property.latitude ?? undefined,
          longitude: property.longitude ?? undefined,
          bedrooms: property.bedrooms ?? undefined,
          bathrooms: property.bathrooms ?? undefined,
          area: property.area ?? undefined,
          landArea: property.landArea ?? undefined,
          floors: property.floors ?? undefined,
          yearBuilt: property.yearBuilt ?? undefined,
          garage: property.garage ?? undefined,
          pool: property.pool ?? undefined,
          features: property.features ?? [],
          featured: property.featured,
          isNew: property.isNew,
          developerId: property.developerId,
          agentId: property.agentId,
        };

        const existingImages: GalleryImage[] = (property.images ?? []).map(
          (img: ApiPropertyImage) => ({
            id: img.id,
            src: img.src,
            alt:
              typeof img.alt === "string"
                ? img.alt
                : (img.alt as Record<string, string> | null)?.en ?? "",
            isHero: img.isHero ?? false,
          }),
        );

        return (
          <FormPageShell
            title={t("editProperty")}
            actions={
              <EntityDeleteButton
                apiPath={`/properties/${id}`}
                permission="property.delete"
                resource={property}
                listHref="/properties"
                invalidateKeys={[["properties"], ["property", id]]}
                confirmTitle={t("deleteTitle")}
                confirmDescription={t("deleteDescription")}
                successMessage={t("deleted")}
                errorMessage={t("deleteFailed")}
              />
            }
          >
            <PropertyForm
              cancelHref={`/properties/${id}`}
              defaultValues={defaultValues}
              images={existingImages}
              onSubmit={(data, images) =>
                updateMutation.mutate({ data, images })
              }
              loading={updateMutation.isPending}
              submissionError={updateMutation.error}
            />
          </FormPageShell>
        );
      }}
    />
  );
}
