"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { AgentForm } from "@/components/forms/agent-form";
import { PageHeader } from "@/components/shared/page-header";
import type { AgentFormValues } from "@/lib/validations/agent";

interface InviteResponse {
  id: string;
  agentId: string;
  email: string;
  expiresAt: string;
  emailDelivered: boolean;
}

export default function InviteAgentPage() {
  const router = useRouter();
  const t = useTranslations("Invitations");

  const inviteMutation = useMutation({
    mutationFn: (data: AgentFormValues) =>
      apiClient<InviteResponse>("/invitations/agents", {
        method: "POST",
        body: data,
      }),
    onSuccess: (result) => {
      if (result.emailDelivered) {
        toast.success(t("sent", { email: result.email }));
      } else {
        // Invitation persisted but email send failed — admin can retry from
        // the invitations list. Treat as a warning, not a silent success.
        toast.warning(t("sentEmailFailed", { email: result.email }));
      }
      router.push("/agents");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("inviteAgent")}
        description={t("inviteDescription")}
      />
      <AgentForm
        cancelHref="/agents"
        // Photo upload skipped on invite — the agent adds it themselves
        // from /profile after accepting. Keeps the invite form minimal.
        onSubmit={(data) => inviteMutation.mutate(data)}
        loading={inviteMutation.isPending}
        submissionError={inviteMutation.error}
      />
    </div>
  );
}
