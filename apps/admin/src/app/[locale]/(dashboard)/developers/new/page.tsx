"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { DeveloperForm } from "@/components/forms/developer-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { DeveloperFormValues } from "@/lib/validations/developer";

export default function NewDeveloperPage() {
  const router = useRouter();
  const t = useTranslations("Developers");

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      logo,
    }: {
      data: DeveloperFormValues;
      logo: File | null;
    }) => {
      const dev = await apiClient<{ id: string }>("/developers", {
        method: "POST",
        body: data,
      });
      if (logo) {
        const formData = new FormData();
        formData.append("logo", logo);
        try {
          await apiClient(`/developers/${dev.id}/logo`, {
            method: "POST",
            body: formData,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
      return dev;
    },
    onSuccess: (dev) => {
      toast.success(t("created"));
      router.push(`/developers/${dev.id}`);
    },
  });

  return (
    <FormPageShell title={t("newDeveloper")}>
      <DeveloperForm
        cancelHref="/developers"
        onSubmit={(data, logo) => createMutation.mutate({ data, logo })}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
      />
    </FormPageShell>
  );
}
