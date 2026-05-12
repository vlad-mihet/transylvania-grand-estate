"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button, Skeleton } from "@tge/ui";
import { Mail, RotateCcw, ShieldOff, ShieldCheck } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DetailSheet,
  DetailSheetSection,
} from "@/components/shared/detail-sheet";
import type { AuthUser } from "@/components/auth/auth-provider";
import { ROLE_TONE, STATUS_TONE } from "./constants";
import type { AdminUser, UserActivity } from "./types";

interface UserPeekSheetProps {
  userId: string | null;
  self: AuthUser | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Side-panel detail view for /users rows. Aggregates the heavyweight reads
 * (audit, identities, pending invitation) behind a single endpoint
 * (`/auth/users/:id/activity`) so opening the panel costs one round-trip.
 *
 * Lifecycle actions land here too — suspend, reactivate, send-password-
 * reset, resend invitation — keeping the row-level table free of clutter.
 */
export function UserPeekSheet({
  userId,
  self,
  onOpenChange,
}: UserPeekSheetProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("Users");
  const tc = useTranslations("Common");

  const open = !!userId;
  const isSelf = userId === self?.id;

  const activityQuery = useQuery({
    enabled: open,
    queryKey: ["user-activity", userId],
    queryFn: () => apiClient<UserActivity>(`/auth/users/${userId}/activity`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["user-activity", userId] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const suspendMutation = useMutation({
    mutationFn: () =>
      apiClient<AdminUser>(`/auth/users/${userId}/suspend`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success(t("suspendedToast"));
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t("suspendFailed")),
  });

  const reactivateMutation = useMutation({
    mutationFn: () =>
      apiClient<AdminUser>(`/auth/users/${userId}/reactivate`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success(t("reactivatedToast"));
      invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : t("reactivateFailed"),
      ),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      apiClient<{ ok: true; emailDelivered: boolean }>(
        `/auth/users/${userId}/reset-password`,
        { method: "POST" },
      ),
    onSuccess: (res) => {
      toast.success(
        res.emailDelivered
          ? t("passwordResetSent")
          : t("passwordResetQueued"),
      );
      invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : t("passwordResetFailed"),
      ),
  });

  const resendInviteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/invitations/${id}/resend`, { method: "POST" }),
    onSuccess: () => {
      toast.success(t("inviteResentToast"));
      invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : t("inviteResendFailed"),
      ),
  });

  const data = activityQuery.data;
  const user = data?.user;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={user?.name ?? t("peekLoading")}
      subtitle={
        user ? <Mono className="text-muted-foreground">{user.email}</Mono> : null
      }
      status={
        user ? (
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={user.role} tone={ROLE_TONE[user.role]} />
            <StatusBadge
              status={user.status}
              tone={STATUS_TONE[user.status]}
            />
          </div>
        ) : null
      }
      footer={
        user ? (
          <div className="flex flex-wrap gap-2">
            {user.status === "ACTIVE" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isSelf || suspendMutation.isPending}
                title={isSelf ? t("cannotSuspendSelf") : undefined}
                onClick={() => suspendMutation.mutate()}
              >
                <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                {t("suspend")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={reactivateMutation.isPending}
                onClick={() => reactivateMutation.mutate()}
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                {t("reactivate")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate()}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("sendPasswordReset")}
            </Button>
          </div>
        ) : null
      }
    >
      {activityQuery.isLoading ? (
        <div className="space-y-4 py-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("peekNotFound")}
        </p>
      ) : (
        <>
          <DetailSheetSection label={t("peekTabActivity")}>
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">{t("lastLogin")}</dt>
              <dd>
                {data.user.lastLoginAt ? (
                  <RelativeTime value={data.user.lastLoginAt} />
                ) : (
                  <span className="text-muted-foreground">
                    {t("lastLoginNever")}
                  </span>
                )}
              </dd>
              <dt className="text-muted-foreground">{t("lastSeen")}</dt>
              <dd>
                {data.user.lastSeenAt ? (
                  <RelativeTime value={data.user.lastSeenAt} />
                ) : (
                  <span className="text-muted-foreground">
                    {t("lastLoginNever")}
                  </span>
                )}
              </dd>
              {data.user.disabledAt ? (
                <>
                  <dt className="text-muted-foreground">{t("suspendedAt")}</dt>
                  <dd>
                    <RelativeTime value={data.user.disabledAt} />
                  </dd>
                </>
              ) : null}
              {data.user.createdAt ? (
                <>
                  <dt className="text-muted-foreground">{t("createdAt")}</dt>
                  <dd>
                    <RelativeTime value={data.user.createdAt} />
                  </dd>
                </>
              ) : null}
            </dl>

            {data.recentAudit.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("noRecentActivity")}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-md border border-border">
                {data.recentAudit.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <Mono className="truncate text-[11px] text-foreground">
                        {row.action}
                      </Mono>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.resource}
                        {row.brand ? ` · ${row.brand}` : ""}
                      </p>
                    </div>
                    <Mono className="shrink-0 text-[11px] text-muted-foreground">
                      <RelativeTime value={row.createdAt} />
                    </Mono>
                  </li>
                ))}
              </ul>
            )}
          </DetailSheetSection>

          <DetailSheetSection label={t("peekTabIdentity")}>
            {data.identities.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("noIdentities")}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {data.identities.map((id) => (
                  <li key={id.id}>
                    <MonoTag>{id.provider}</MonoTag>
                  </li>
                ))}
              </ul>
            )}
            {data.user.agentId ? (
              <p className="mt-2 text-xs">
                <span className="text-muted-foreground">
                  {t("agentLink")}:{" "}
                </span>
                <Mono>{data.user.agentId}</Mono>
              </p>
            ) : null}
          </DetailSheetSection>

          <DetailSheetSection label={t("peekTabInvitation")}>
            {data.pendingInvitation ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <StatusBadge
                    status={data.pendingInvitation.status.toLowerCase()}
                  />
                  <Mono className="text-[11px] text-muted-foreground">
                    {t("expiresAt")}{" "}
                    <RelativeTime value={data.pendingInvitation.expiresAt} />
                  </Mono>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resendInviteMutation.isPending}
                  onClick={() =>
                    resendInviteMutation.mutate(data.pendingInvitation!.id)
                  }
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  {t("resendInvite")}
                </Button>
                {data.pendingInvitation.bouncedAt ? (
                  <p className="text-[11px] text-[var(--color-danger)]">
                    {t("inviteBounced", {
                      reason: data.pendingInvitation.bounceReason ?? "—",
                    })}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("noPendingInvitation")}
              </p>
            )}
          </DetailSheetSection>
        </>
      )}
      {/* Surface the loading state subtly while data refreshes after a mutation. */}
      {activityQuery.isFetching && !activityQuery.isLoading ? (
        <p className="px-1 pb-2 text-[10px] text-muted-foreground">
          {tc("loading")}
        </p>
      ) : null}
    </DetailSheet>
  );
}
