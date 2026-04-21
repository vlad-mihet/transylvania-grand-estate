"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { AgentForm } from "@/components/forms/agent-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { AgentFormValues } from "@/lib/validations/agent";

export default function NewAgentPage() {
  const router = useRouter();
  const t = useTranslations("Agents");

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      photo,
    }: {
      data: AgentFormValues;
      photo: File | null;
    }) => {
      const agent = await apiClient<{ id: string }>("/agents", {
        method: "POST",
        body: data,
      });
      if (photo) {
        const formData = new FormData();
        formData.append("photo", photo);
        try {
          await apiClient(`/agents/${agent.id}/photo`, {
            method: "POST",
            body: formData,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
      return agent;
    },
    onSuccess: (agent) => {
      toast.success(t("created"));
      router.push(`/agents/${agent.id}`);
    },
  });

  return (
    <FormPageShell title={t("newAgent")}>
      <AgentForm
        cancelHref="/agents"
        onSubmit={(data, photo) => createMutation.mutate({ data, photo })}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
      />
    </FormPageShell>
  );
}
