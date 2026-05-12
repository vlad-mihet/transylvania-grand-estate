"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@tge/ui";
import { Loader2, Send, XCircle } from "lucide-react";
import type { ApiAgent } from "@tge/types";

import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Can } from "@/components/shared/can";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";

import {
  ACCOUNT_STATUS_KEY,
  ACCOUNT_STATUS_TONE,
  canSendInvite,
  resolveAccountStatus,
  type AccountStatus,
  type Agent,
} from "../../_components/account-status";

const HELPER_KEY: Record<
  AccountStatus,
  | "linkedHelper"
  | "pendingHelper"
  | "expiredHelper"
  | "noLoginHelper"
  | "bouncedHelper"
> = {
  ACTIVE: "linkedHelper",
  PENDING: "pendingHelper",
  EXPIRED: "expiredHelper",
  REVOKED: "noLoginHelper",
  BOUNCED: "bouncedHelper",
  NONE: "noLoginHelper",
};

export function AccessTab({ agent }: { agent: ApiAgent }) {
  const queryClient = useQueryClient();
  const t = useTranslations("People.agentDetail.access");
  const ti = useTranslations("Invitations");
  const [revokeOpen, setRevokeOpen] = useState(false);

  const status = resolveAccountStatus(agent as Agent);
  const invitation = agent.invitation ?? null;
  const showSendInvite = canSendInvite(status);
  const showRevoke = status === "PENDING" && !!invitation?.id;
  const showResend = status === "PENDING" && !!invitation?.id;

  const invalidateAgent = () => {
    queryClient.invalidateQueries({ queryKey: ["agent", agent.id] });
    queryClient.invalidateQueries({ queryKey: ["agents"] });
  };

  const sendInviteMutation = useMutation({
    mutationFn: () =>
      apiClient<{ emailDelivered: boolean }>(
        `/invitations/agents/${agent.id}/invite`,
        { method: "POST", body: {} },
      ),
    onSuccess: (result) => {
      invalidateAgent();
      if (result.emailDelivered) {
        toast.success(ti("sendInviteSuccess"));
      } else {
        toast.warning(ti("resendEmailFailed"));
      }
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : ti("sendInviteFailed"),
      ),
  });

  const resendMutation = useMutation({
    mutationFn: (invitationId: string) =>
      apiClient<{ emailDelivered: boolean }>(
        `/invitations/${invitationId}/resend`,
        { method: "POST" },
      ),
    onSuccess: (result) => {
      invalidateAgent();
      if (result.emailDelivered) toast.success(ti("resendSuccess"));
      else toast.warning(ti("resendEmailFailed"));
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : ti("resendFailed"),
      ),
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      apiClient(`/invitations/${invitationId}/revoke`, { method: "POST" }),
    onSuccess: () => {
      invalidateAgent();
      toast.success(ti("revokeSuccess"));
      setRevokeOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : ti("revokeFailed"));
      setRevokeOpen(false);
    },
  });

  const noActions = !showSendInvite && !showRevoke && !showResend;

  return (
    <>
      <Card className="rounded-md border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t("headline")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-col gap-1">
                <span className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("statusLabel")}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={ti(ACCOUNT_STATUS_KEY[status])}
                    tone={ACCOUNT_STATUS_TONE[status]}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(HELPER_KEY[status])}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("emailLabel")}
                </span>
                <Mono className="text-sm text-foreground">{agent.email}</Mono>
              </div>

              {invitation && status === "PENDING" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {invitation.emailSentAt && (
                    <div className="flex flex-col gap-1">
                      <span className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {t("invitationSentLabel")}
                      </span>
                      <span className="text-sm text-foreground">
                        <RelativeTime value={invitation.emailSentAt} />
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <span className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {t("invitationExpiresLabel")}
                    </span>
                    <span className="text-sm text-foreground">
                      <RelativeTime value={invitation.expiresAt} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Can action="agent.create">
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              {noActions ? (
                <p className="text-xs text-muted-foreground">
                  {t("noActions")}
                </p>
              ) : (
                <>
                  {showResend && invitation && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendMutation.mutate(invitation.id)}
                      disabled={resendMutation.isPending}
                    >
                      {resendMutation.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {ti("resend")}
                    </Button>
                  )}
                  {showRevoke && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                      onClick={() => setRevokeOpen(true)}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      {ti("revoke")}
                    </Button>
                  )}
                  {showSendInvite && (
                    <Button
                      size="sm"
                      onClick={() => sendInviteMutation.mutate()}
                      disabled={sendInviteMutation.isPending}
                    >
                      {sendInviteMutation.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {ti("sendInvite")}
                    </Button>
                  )}
                </>
              )}
            </div>
          </Can>
        </CardContent>
      </Card>

      <DeleteDialog
        open={revokeOpen}
        onOpenChange={(open) => !open && setRevokeOpen(false)}
        onConfirm={() =>
          invitation?.id && revokeMutation.mutate(invitation.id)
        }
        title={ti("revokeTitle")}
        description={ti("revokeDescription")}
        loading={revokeMutation.isPending}
      />
    </>
  );
}
