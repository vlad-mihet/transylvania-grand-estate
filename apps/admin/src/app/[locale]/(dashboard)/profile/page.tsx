"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@tge/ui";
import { Mono } from "@/components/shared/mono";
import {
  AgentProfileForm,
  type AgentProfileValues,
} from "@/components/forms/agent-profile-form";
import { useAuth } from "@/components/auth/auth-provider";
import type { ApiAgent } from "@tge/types";

type MyAgent = ApiAgent & { photo?: string | null };

export default function ProfilePage() {
  const { user } = useAuth();
  const t = useTranslations("Profile");
  const tc = useTranslations("Common");
  const queryClient = useQueryClient();

  const {
    data: agent,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["agent-me"],
    queryFn: () => apiClient<MyAgent>("/agents/me"),
    // Don't fire the query if there's no logged-in user yet (AuthGuard will
    // redirect shortly) — it'd just 401 and surface a misleading toast.
    enabled: !!user,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      data,
      photoFile,
    }: {
      data: AgentProfileValues;
      photoFile: File | null;
    }) => {
      if (!agent) throw new Error("No agent loaded");
      await apiClient(`/agents/${agent.id}`, { method: "PATCH", body: data });
      if (photoFile) {
        const form = new FormData();
        form.append("photo", photoFile);
        await apiClient(`/agents/${agent.id}/photo`, {
          method: "POST",
          body: form,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-me"] });
      toast.success(t("saved"));
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : t("saveFailed")),
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={
          agent
            ? `${agent.firstName} ${agent.lastName}`
            : t("description")
        }
      />

      {isLoading ? (
        <LoadingState label={tc("loading")} />
      ) : isError ? (
        <NoAgentLinkedOrError onRetry={() => refetch()} />
      ) : !agent ? (
        <NoAgentLinked />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border bg-muted/40 px-4 py-2.5 text-xs">
            <Mono className="text-muted-foreground">
              {agent.email} · slug: {agent.slug} · active:{" "}
              {agent.active ? "yes" : "no"}
            </Mono>
          </div>
          <AgentProfileForm
            defaultValues={{
              firstName: agent.firstName,
              lastName: agent.lastName,
              phone: agent.phone,
              bio: agent.bio as AgentProfileValues["bio"],
            }}
            photoUrl={agent.photo ?? null}
            onSubmit={(data, photoFile) =>
              saveMutation.mutate({ data, photoFile })
            }
            loading={saveMutation.isPending}
            submissionError={saveMutation.error}
          />
        </div>
      )}
    </div>
  );
}

function NoAgentLinked() {
  const t = useTranslations("Profile");
  return (
    <EmptyState
      title={t("noAgentLinked")}
      description={t("askAdmin")}
    />
  );
}

function NoAgentLinkedOrError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("Profile");
  const tc = useTranslations("Common");
  // /agents/me 404s when the AGENT account isn't linked yet. Show a tailored
  // empty state instead of a generic "try again" — retry won't help.
  return (
    <>
      <EmptyState title={t("noAgentLinked")} description={t("askAdmin")} />
      <div className="self-center">
        <ErrorState onRetry={onRetry} retryLabel={tc("retry")} />
      </div>
    </>
  );
}
