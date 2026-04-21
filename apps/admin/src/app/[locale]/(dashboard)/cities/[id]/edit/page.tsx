"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ApiCity } from "@tge/types";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { CityForm } from "@/components/forms/city-form";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { CityFormValues } from "@/lib/validations/city";

export default function EditCityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Cities");

  const updateMutation = useMutation({
    mutationFn: async ({
      data,
      image,
    }: {
      data: CityFormValues;
      image: File | null;
    }) => {
      await apiClient(`/cities/${id}`, { method: "PATCH", body: data });
      if (image) {
        const fd = new FormData();
        fd.append("image", image);
        try {
          await apiClient(`/cities/${id}/image`, {
            method: "POST",
            body: fd,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city", id] });
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast.success(t("updated"));
      router.push(`/cities/${id}`);
    },
  });

  return (
    <DetailPageShell<ApiCity>
      queryKey={["city", id]}
      queryFn={() => apiClient<ApiCity>(`/cities/id/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(city) => (
        <FormPageShell
          title={t("editCity")}
          actions={
            <EntityDeleteButton
              apiPath={`/cities/${id}`}
              permission="city.delete"
              listHref="/cities"
              invalidateKeys={[["cities"], ["city", id]]}
              confirmTitle={t("deleteTitle")}
              successMessage={t("deleted")}
              errorMessage={t("deleteFailed")}
            />
          }
        >
          <CityForm
            cancelHref={`/cities/${id}`}
            defaultValues={{
              ...city,
              countySlug: city.countySlug ?? undefined,
              image: city.image ?? undefined,
            }}
            imageUrl={city.image}
            onSubmit={(data, image) => updateMutation.mutate({ data, image })}
            loading={updateMutation.isPending}
            submissionError={updateMutation.error}
          />
        </FormPageShell>
      )}
    />
  );
}
