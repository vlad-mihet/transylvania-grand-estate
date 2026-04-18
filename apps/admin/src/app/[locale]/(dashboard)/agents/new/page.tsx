"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { AgentForm } from "@/components/forms/agent-form";
import { PageHeader } from "@/components/shared/page-header";
import { AgentFormValues } from "@/lib/validations/agent";
import { useTranslations } from "next-intl";

export default function NewAgentPage() {
  const router = useRouter();
  const t = useTranslations("Agents");

  const createMutation = useMutation({
    mutationFn: async ({ data, photo }: { data: AgentFormValues; photo: File | null }) => {
      const agent = await apiClient<{ id: string }>("/agents", { method: "POST", body: data });
      if (photo) {
        const formData = new FormData();
        formData.append("photo", photo);
        try {
          await apiClient(`/agents/${agent.id}/photo`, { method: "POST", body: formData });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
      return agent;
    },
    onSuccess: () => {
      toast.success(t("created"));
      router.push("/agents");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("newAgent")} />
      <AgentForm
        onSubmit={(data, photo) => createMutation.mutate({ data, photo })}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
      />
    </div>
  );
}
