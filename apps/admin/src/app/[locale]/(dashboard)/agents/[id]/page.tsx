"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { AgentForm } from "@/components/forms/agent-form";
import { PageHeader } from "@/components/shared/page-header";
import { AgentFormValues } from "@/lib/validations/agent";
import type { ApiAgent } from "@tge/types";
import { useTranslations } from "next-intl";

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Agents");

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", id],
    queryFn: () => apiClient<ApiAgent>(`/agents/id/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ data, photo }: { data: AgentFormValues; photo: File | null }) => {
      await apiClient(`/agents/${id}`, { method: "PATCH", body: data });
      if (photo) {
        const formData = new FormData();
        formData.append("photo", photo);
        try {
          await apiClient(`/agents/${id}/photo`, { method: "POST", body: formData });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", id] });
      toast.success(t("updated"));
      router.push("/agents");
    },
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!agent) return <p>{t("notFound")}</p>;

  return (
    <div className="space-y-6">
      <PageHeader title={t("editAgent")} />
      <AgentForm
        defaultValues={{ ...agent, photo: agent.photo ?? undefined }}
        photoUrl={agent.photo}
        onSubmit={(data, photo) => updateMutation.mutate({ data, photo })}
        loading={updateMutation.isPending}
        submissionError={updateMutation.error}
      />
    </div>
  );
}
