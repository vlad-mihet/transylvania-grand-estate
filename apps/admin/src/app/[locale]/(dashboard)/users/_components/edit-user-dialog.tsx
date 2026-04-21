"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
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

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AdminRole>("EDITOR");
  const [editAgentId, setEditAgentId] = useState<string>("");

  useEffect(() => {
    if (!editing) return;
    setEditName(editing.name);
    setEditRole(editing.role);
    setEditAgentId(editing.agentId ?? "");
  }, [editing]);

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

  const lockSelfDemote = editing.id === self?.id && editing.role === "SUPER_ADMIN";
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
