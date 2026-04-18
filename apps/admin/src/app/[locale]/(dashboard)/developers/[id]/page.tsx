"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { DeveloperForm } from "@/components/forms/developer-form";
import { PageHeader } from "@/components/shared/page-header";
import { DeveloperFormValues } from "@/lib/validations/developer";
import type { ApiDeveloper } from "@tge/types";
import { useTranslations } from "next-intl";

export default function EditDeveloperPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Developers");

  const { data: developer, isLoading } = useQuery({
    queryKey: ["developer", id],
    queryFn: () => apiClient<ApiDeveloper>(`/developers/id/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ data, logo }: { data: DeveloperFormValues; logo: File | null }) => {
      await apiClient(`/developers/${id}`, { method: "PATCH", body: data });
      if (logo) {
        const formData = new FormData();
        formData.append("logo", logo);
        try {
          await apiClient(`/developers/${id}/logo`, { method: "POST", body: formData });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developer", id] });
      toast.success(t("updated"));
      router.push("/developers");
    },
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!developer) return <p>{t("notFound")}</p>;

  return (
    <div className="space-y-6">
      <PageHeader title={t("editDeveloper")} />
      <DeveloperForm
        defaultValues={developer as Partial<DeveloperFormValues>}
        logoUrl={developer.logo}
        onSubmit={(data, logo) => updateMutation.mutate({ data, logo })}
        loading={updateMutation.isPending}
        submissionError={updateMutation.error}
      />
    </div>
  );
}
