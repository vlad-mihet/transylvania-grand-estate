"use client";

import { useState } from "react";
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
import type { AdminRole } from "@/lib/permissions";
import { ROLES } from "./constants";
import type { AgentSummary, CreateUserPayload } from "./types";

const EMPTY: CreateUserPayload = {
  email: "",
  name: "",
  password: "",
  role: "EDITOR",
  agentId: "",
};

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unlinkedAgents: AgentSummary[];
  onSubmit: (payload: CreateUserPayload) => void;
  isPending: boolean;
}

/**
 * Create-user modal. Owns its own form state; parent only supplies the
 * unlinked-agents pool and the submit callback. AGENT-role picks the agent
 * link inline; other roles skip that section.
 */
export function CreateUserDialog({
  open,
  onOpenChange,
  unlinkedAgents,
  onSubmit,
  isPending,
}: CreateUserDialogProps) {
  const t = useTranslations("Users");
  const tc = useTranslations("Common");
  const [form, setForm] = useState<CreateUserPayload>(EMPTY);

  const valid =
    form.email.includes("@") &&
    form.name.trim().length >= 2 &&
    form.password.length >= 6 &&
    (form.role !== "AGENT" || form.agentId.length > 0);

  const handleOpenChange = (next: boolean) => {
    if (!next) setForm(EMPTY);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newUser")}</DialogTitle>
          <DialogDescription>{t("newUserDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="user-email">{t("fieldEmail")}</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@example.com"
              className="mono"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="user-name">{t("fieldName")}</Label>
            <Input
              id="user-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="user-password">{t("fieldPassword")}</Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
            <p className="text-[11px] text-muted-foreground">
              {t("passwordHint")}
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="user-role">{t("fieldRole")}</Label>
            <Select
              value={form.role}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  role: v as AdminRole,
                  agentId: v === "AGENT" ? form.agentId : "",
                })
              }
            >
              <SelectTrigger id="user-role">
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
          </div>
          {form.role === "AGENT" && (
            <div className="grid gap-1.5">
              <Label htmlFor="user-agent">{t("selectAgent")}</Label>
              {unlinkedAgents.length > 0 ? (
                <Select
                  value={form.agentId}
                  onValueChange={(v) => setForm({ ...form, agentId: v })}
                >
                  <SelectTrigger id="user-agent">
                    <SelectValue placeholder={t("selectAgent")} />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedAgents.map((a) => (
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
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={!valid || isPending}
          >
            {isPending ? tc("saving") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
