"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { DeveloperForm } from "@/components/forms/developer-form";
import { PageHeader } from "@/components/shared/page-header";
import { DeveloperFormValues } from "@/lib/validations/developer";
import { useTranslations } from "next-intl";

export default function NewDeveloperPage() {
  const router = useRouter();
  const t = useTranslations("Developers");

  const createMutation = useMutation({
    mutationFn: async ({ data, logo }: { data: DeveloperFormValues; logo: File | null }) => {
      const dev = await apiClient<{ id: string }>("/developers", { method: "POST", body: data });
      if (logo) {
        const formData = new FormData();
        formData.append("logo", logo);
        try {
          await apiClient(`/developers/${dev.id}/logo`, { method: "POST", body: formData });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
      return dev;
    },
    onSuccess: () => {
      toast.success(t("created"));
      router.push("/developers");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("newDeveloper")} />
      <DeveloperForm
        onSubmit={(data, logo) => createMutation.mutate({ data, logo })}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
      />
    </div>
  );
}
