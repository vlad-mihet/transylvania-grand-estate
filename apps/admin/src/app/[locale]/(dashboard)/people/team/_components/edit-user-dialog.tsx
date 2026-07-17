"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { RotateCcw, ShieldCheck, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { AuthUser } from "@/components/auth/auth-provider";
import type { AdminRole } from "@/lib/permissions";
import { ROLES } from "./constants";
import type { AdminUser, AgentSummary, UpdateUserPayload } from "./types";

interface EditUserDialogProps {
  editing: AdminUser | null;
  onClose: () => void;
  self: AuthUser | null;
  unlinkedAgents: AgentSummary[];
  onSubmit: (payload: UpdateUserPayload) => void;
  isPending: boolean;
}

/**
 * Edit-user modal. Loads the editing target's currently-linked agent (if
 * any) so the AGENT-link select can present it as a stable choice alongside
 * unlinked options. Computes the PATCH payload diff itself so only changed
 * fields land in the request.
 */
export function EditUserDialog({
  editing,
  onClose,
  self,
  unlinkedAgents,
  onSubmit,
  isPending,
}: EditUserDialogProps) {
  const t = useTranslations("Users");
  const tc = useTranslations("Common");
  const queryClient = useQueryClient();

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AdminRole>("EDITOR");
  const [editAgentId, setEditAgentId] = useState<string>("");

  // Sync the form fields when a different user is opened for editing. Adjust
  // state during render (React's "storing prior props" pattern) rather than in
  // an effect — keyed on the record id so re-opening the same row is a no-op.
  const [prevEditingId, setPrevEditingId] = useState(editing?.id);
  if (editing && editing.id !== prevEditingId) {
    setPrevEditingId(editing.id);
    setEditName(editing.name);
    setEditRole(editing.role);
    setEditAgentId(editing.agentId ?? "");
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    if (editing?.id) {
      queryClient.invalidateQueries({
        queryKey: ["user-activity", editing.id],
      });
    }
  };

  const suspendMutation = useMutation({
    mutationFn: () =>
      apiClient(`/auth/users/${editing!.id}/suspend`, { method: "POST" }),
    onSuccess: () => {
      toast.success(t("suspendedToast"));
      invalidate();
      onClose();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t("suspendFailed")),
  });

  const reactivateMutation = useMutation({
    mutationFn: () =>
      apiClient(`/auth/users/${editing!.id}/reactivate`, { method: "POST" }),
    onSuccess: () => {
      toast.success(t("reactivatedToast"));
      invalidate();
      onClose();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : t("reactivateFailed"),
      ),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      apiClient<{ ok: true; emailDelivered: boolean }>(
        `/auth/users/${editing!.id}/reset-password`,
        { method: "POST" },
      ),
    onSuccess: (res) =>
      toast.success(
        res.emailDelivered
          ? t("passwordResetSent")
          : t("passwordResetQueued"),
      ),
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : t("passwordResetFailed"),
      ),
  });

  const editingCurrentAgent = useQuery({
    queryKey: ["agent", editing?.agentId],
    queryFn: () =>
      apiClient<AgentSummary>(`/agents/id/${editing!.agentId}`),
    enabled: !!editing?.agentId,
    staleTime: 60_000,
  });

  const editAgentOptions = useMemo<AgentSummary[]>(() => {
    const current = editingCurrentAgent.data;
    if (!current) return unlinkedAgents;
    const dedup = new Map<string, AgentSummary>();
    dedup.set(current.id, current);
    for (const a of unlinkedAgents) dedup.set(a.id, a);
    return Array.from(dedup.values());
  }, [editingCurrentAgent.data, unlinkedAgents]);

  if (!editing) return null;

  const isSelf = editing.id === self?.id;
  const lockSelfDemote = isSelf && editing.role === "SUPER_ADMIN";
  const isSuspended = editing.status === "SUSPENDED";
  const unchanged =
    editName === editing.name &&
    editRole === editing.role &&
    editAgentId === (editing.agentId ?? "");
  const disabled =
    isPending || unchanged || (editRole === "AGENT" && !editAgentId);

  const handleSave = () => {
    const payload: UpdateUserPayload = { id: editing.id };
    if (editName !== editing.name) payload.name = editName;
    if (editRole !== editing.role) payload.role = editRole;
    if (editRole === "AGENT") {
      if (editAgentId && editAgentId !== editing.agentId) {
        payload.agentId = editAgentId;
      }
    } else if (editing.role === "AGENT") {
      // Moving off AGENT — explicit unlink.
      payload.agentId = null;
    }
    onSubmit(payload);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editUser")}</DialogTitle>
          <DialogDescription className="mono">{editing.email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-name">{t("fieldName")}</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-role">{t("fieldRole")}</Label>
            <Select
              value={editRole}
              onValueChange={(v) => {
                const next = v as AdminRole;
                setEditRole(next);
                if (next !== "AGENT") setEditAgentId("");
              }}
              disabled={lockSelfDemote}
            >
              <SelectTrigger id="edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lockSelfDemote && (
              <p className="text-[11px] text-muted-foreground">
                {t("cannotDemoteSelf")}
              </p>
            )}
          </div>
          {editRole === "AGENT" && (
            <div className="grid gap-1.5">
              <Label htmlFor="edit-agent">{t("selectAgent")}</Label>
              {editAgentOptions.length > 0 ? (
                <Select
                  value={editAgentId}
                  onValueChange={(v) => setEditAgentId(v)}
                >
                  <SelectTrigger id="edit-agent">
                    <SelectValue placeholder={t("selectAgent")} />
                  </SelectTrigger>
                  <SelectContent>
                    {editAgentOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.firstName} {a.lastName} · {a.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {t("noUnlinkedAgents")}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t("agentLinkRequiredForAgentRole")}
              </p>
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/40 p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {isSuspended ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={reactivateMutation.isPending}
                  onClick={() => reactivateMutation.mutate()}
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  {t("reactivate")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSelf || suspendMutation.isPending}
                  title={isSelf ? t("cannotSuspendSelf") : undefined}
                  onClick={() => suspendMutation.mutate()}
                >
                  <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                  {t("suspend")}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={resetPasswordMutation.isPending}
                onClick={() => resetPasswordMutation.mutate()}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t("sendPasswordReset")}
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {t("lifecycleHint")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={disabled}>
            {isPending ? tc("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
