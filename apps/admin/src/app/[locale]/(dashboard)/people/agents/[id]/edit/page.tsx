"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ApiAgent } from "@tge/types";

import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { AgentForm } from "@/components/forms/agent-form";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { AgentFormValues } from "@/lib/validations/agent";

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Agents");
  const tc = useTranslations("Common");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("agent.update")) router.replace("/403");
  }, [can, router]);

  const updateMutation = useMutation({
    mutationFn: async ({
      data,
      photo,
    }: {
      data: AgentFormValues;
      photo: File | null;
    }) => {
      await apiClient(`/agents/${id}`, { method: "PATCH", body: data });
      if (photo) {
        const formData = new FormData();
        formData.append("photo", photo);
        try {
          await apiClient(`/agents/${id}/photo`, {
            method: "POST",
            body: formData,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", id] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(t("updated"));
      router.push(`/people/agents/${id}`);
    },
  });

  if (!can("agent.update")) return null;

  return (
    <DetailPageShell<ApiAgent>
      queryKey={["agent", id]}
      queryFn={() => apiClient<ApiAgent>(`/agents/id/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(agent) => (
        <div>
          <div className="flex items-center justify-end gap-2 px-4 pt-3 md:px-6">
            <EntityDeleteButton
              apiPath={`/agents/${id}`}
              permission="agent.delete"
              listHref="/people/agents"
              invalidateKeys={[["agents"], ["agent", id]]}
              confirmTitle={t("deleteTitle")}
              confirmDescription={t("deleteDescription")}
              successMessage={t("deleted")}
              errorMessage={t("deleteFailed")}
            />
          </div>
          <AgentForm
            cancelHref={`/people/agents/${id}`}
            defaultValues={{ ...agent, photo: agent.photo ?? undefined }}
            photoUrl={agent.photo}
            onSubmit={(data, photo) => updateMutation.mutate({ data, photo })}
            loading={updateMutation.isPending}
            submissionError={updateMutation.error}
            title={`${agent.firstName} ${agent.lastName}`}
            breadcrumb={
              <Link
                href={`/people/agents/${id}`}
                className="hover:text-foreground hover:underline"
              >
                {tc("back")}
              </Link>
            }
          />
        </div>
      )}
    />
  );
}
