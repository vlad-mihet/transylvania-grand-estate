"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ApiDeveloper } from "@tge/types";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { DeveloperForm } from "@/components/forms/developer-form";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { DeveloperFormValues } from "@/lib/validations/developer";

export default function EditDeveloperPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Developers");

  const updateMutation = useMutation({
    mutationFn: async ({
      data,
      logo,
    }: {
      data: DeveloperFormValues;
      logo: File | null;
    }) => {
      await apiClient(`/developers/${id}`, { method: "PATCH", body: data });
      if (logo) {
        const formData = new FormData();
        formData.append("logo", logo);
        try {
          await apiClient(`/developers/${id}/logo`, {
            method: "POST",
            body: formData,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developer", id] });
      queryClient.invalidateQueries({ queryKey: ["developers"] });
      toast.success(t("updated"));
      router.push(`/developers/${id}`);
    },
  });

  return (
    <DetailPageShell<ApiDeveloper>
      queryKey={["developer", id]}
      queryFn={() => apiClient<ApiDeveloper>(`/developers/id/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(developer) => (
        <FormPageShell
          title={t("editDeveloper")}
          actions={
            <EntityDeleteButton
              apiPath={`/developers/${id}`}
              permission="developer.delete"
              listHref="/developers"
              invalidateKeys={[["developers"], ["developer", id]]}
              confirmTitle={t("deleteTitle")}
              successMessage={t("deleted")}
              errorMessage={t("deleteFailed")}
            />
          }
        >
          <DeveloperForm
            cancelHref={`/developers/${id}`}
            defaultValues={developer as Partial<DeveloperFormValues>}
            logoUrl={developer.logo}
            onSubmit={(data, logo) => updateMutation.mutate({ data, logo })}
            loading={updateMutation.isPending}
            submissionError={updateMutation.error}
          />
        </FormPageShell>
      )}
    />
  );
}
