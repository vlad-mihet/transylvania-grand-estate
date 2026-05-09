"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { AgentForm } from "@/components/forms/agent-form";
import { AgentFormValues } from "@/lib/validations/agent";

export default function NewAgentPage() {
  const router = useRouter();
  const t = useTranslations("Agents");
  const tc = useTranslations("Common");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("agent.create")) router.replace("/403");
  }, [can, router]);

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

  if (!can("agent.create")) return null;

  return (
    <AgentForm
      cancelHref="/agents"
      onSubmit={(data, photo) => createMutation.mutate({ data, photo })}
      loading={createMutation.isPending}
      submissionError={createMutation.error}
      title={t("newAgent")}
      breadcrumb={
        <Link href="/agents" className="hover:text-foreground hover:underline">
          {tc("back")}
        </Link>
      }
    />
  );
}
