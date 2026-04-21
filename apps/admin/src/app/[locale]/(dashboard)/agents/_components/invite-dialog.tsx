"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tge/ui";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Agent } from "./account-status";

interface InviteAgentDialogProps {
  target: Agent | null;
  onClose: () => void;
  onConfirm: (agentId: string) => void;
  isPending: boolean;
}

/**
 * Confirmation dialog for sending (or resending) an invitation to an agent
 * who doesn't yet have a login. Parent owns the mutation; this component is
 * purely the confirmation shell.
 */
export function InviteAgentDialog({
  target,
  onClose,
  onConfirm,
  isPending,
}: InviteAgentDialogProps) {
  const ti = useTranslations("Invitations");
  const tc = useTranslations("Common");

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target
              ? ti("sendInviteTitle", {
                  name: `${target.firstName} ${target.lastName}`,
                })
              : ""}
          </DialogTitle>
          <DialogDescription>
            {target
              ? ti("sendInviteDescription", { email: target.email })
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={() => target && onConfirm(target.id)}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                {tc("saving")}
              </>
            ) : (
              ti("sendInviteConfirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
