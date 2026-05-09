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
import { INVITABLE_ROLES, type InvitableRole } from "./constants";
import type { InviteUserPayload } from "./types";

const EMPTY: InviteUserPayload = {
  email: "",
  name: "",
  role: "EDITOR",
};

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: InviteUserPayload) => void;
  isPending: boolean;
}

/**
 * Sends an invitation email instead of creating an account with a typed
 * password. Restricted to non-AGENT roles (AGENT onboarding lives on
 * /agents/invite because it also creates the Agent profile). The recipient
 * accepts via the existing /accept-invite flow and chooses their own
 * password (or signs in with Google if SSO is configured).
 */
export function InviteUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: InviteUserDialogProps) {
  const t = useTranslations("Users");
  const tc = useTranslations("Common");
  const [form, setForm] = useState<InviteUserPayload>(EMPTY);

  const valid =
    form.email.includes("@") &&
    form.name.trim().length >= 2;

  const handleOpenChange = (next: boolean) => {
    if (!next) setForm(EMPTY);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inviteUser")}</DialogTitle>
          <DialogDescription>{t("inviteUserDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">{t("fieldEmail")}</Label>
            <Input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@example.com"
              className="mono"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-name">{t("fieldName")}</Label>
            <Input
              id="invite-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-role">{t("fieldRole")}</Label>
            <Select
              value={form.role}
              onValueChange={(v) =>
                setForm({ ...form, role: v as InvitableRole })
              }
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {t("inviteAgentHint")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={!valid || isPending}>
            {isPending ? tc("saving") : t("sendInvite")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
