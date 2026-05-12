"use client";

import { useState } from "react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { useTranslations } from "next-intl";
import { ROLES } from "./constants";
import type { AdminRole } from "@/lib/permissions";
import type { BulkActionPayload } from "./types";

interface BulkActionsProps {
  ids: ReadonlyArray<string>;
  /** Caller-provided id excluded from destructive actions (the actor). */
  selfId: string | null;
  onRun: (payload: BulkActionPayload) => void;
  isPending: boolean;
}

/**
 * Bulk-action bar for /users selection. Suspend / reactivate / change-role /
 * delete. Self-id is filtered out of destructive actions client-side; the
 * server enforces the same guard so a stale UI can't slip past.
 */
export function UsersBulkActions({
  ids,
  selfId,
  onRun,
  isPending,
}: BulkActionsProps) {
  const t = useTranslations("Users");
  const [setRoleValue, setSetRoleValue] = useState<AdminRole | "">("");

  const safeIds = (filterSelf: boolean): string[] =>
    filterSelf && selfId ? ids.filter((id) => id !== selfId) : Array.from(ids);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending || safeIds(true).length === 0}
        onClick={() =>
          onRun({ ids: safeIds(true), action: "suspend" })
        }
      >
        {t("bulkSuspend")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending || ids.length === 0}
        onClick={() => onRun({ ids: Array.from(ids), action: "reactivate" })}
      >
        {t("bulkReactivate")}
      </Button>

      <div className="flex items-center gap-1.5">
        <Select
          value={setRoleValue}
          onValueChange={(v) => setSetRoleValue(v as AdminRole)}
        >
          <SelectTrigger className="h-8 w-[10rem]">
            <SelectValue placeholder={t("bulkSetRole")} />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending || !setRoleValue || ids.length === 0}
          onClick={() => {
            if (!setRoleValue) return;
            onRun({
              ids: Array.from(ids),
              action: "set-role",
              role: setRoleValue,
            });
            setSetRoleValue("");
          }}
        >
          {t("apply")}
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
        disabled={isPending || safeIds(true).length === 0}
        onClick={() =>
          onRun({ ids: safeIds(true), action: "delete" })
        }
      >
        {t("bulkDelete")}
      </Button>
    </div>
  );
}
