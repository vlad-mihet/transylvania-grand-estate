"use client";

import { Button } from "@tge/ui";
import { Pencil, Trash2 } from "lucide-react";
import type { ColumnDef } from "@/components/resource/resource-table";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import type { AuthUser } from "@/components/auth/auth-provider";
import { ROLE_TONE } from "./constants";
import type { AdminUser } from "./types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}

interface BuildColumnsArgs {
  self: AuthUser | null;
  onEdit: (user: AdminUser) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
  tc: (key: string) => string;
}

/**
 * Column definitions for the Users resource table. Pulled out of `page.tsx`
 * so the top-level shell reads as pure composition and the cell renderers
 * stay purpose-built without bloating the page file.
 */
export function buildUserColumns({
  self,
  onEdit,
  onDelete,
  t,
  tc,
}: BuildColumnsArgs): ColumnDef<AdminUser, unknown>[] {
  return [
    {
      id: "name",
      header: t("columnName"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-copper/10 text-[11px] font-semibold uppercase text-copper">
            {initials(row.original.name)}
          </div>
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.name}
            {row.original.id === self?.id && (
              <span className="mono ml-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                ({t("you")})
              </span>
            )}
          </p>
        </div>
      ),
    },
    {
      id: "email",
      header: t("columnEmail"),
      cell: ({ row }) => (
        <Mono className="truncate text-foreground/80">{row.original.email}</Mono>
      ),
    },
    {
      id: "role",
      header: t("columnRole"),
      enableSorting: false,
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.role}
          tone={ROLE_TONE[row.original.role]}
        />
      ),
    },
    {
      id: "agentLink",
      header: t("agentLink"),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.role === "AGENT" ? (
          row.original.agentId ? (
            <Mono className="text-foreground/80">{row.original.agentId}</Mono>
          ) : (
            <StatusBadge status="inactive" tone="warning" />
          )
        ) : (
          <Mono className="text-muted-foreground/60">—</Mono>
        ),
    },
    {
      id: "createdAt",
      header: tc("columnUpdated"),
      cell: ({ row }) =>
        row.original.createdAt ? (
          <RelativeTime value={row.original.createdAt} />
        ) : (
          <Mono>—</Mono>
        ),
    },
    {
      id: "actions",
      header: "",
      size: 80,
      enableSorting: false,
      cell: ({ row }) => {
        const isSelf = row.original.id === self?.id;
        return (
          <div
            className="flex justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(row.original)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive/70 hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] disabled:opacity-30"
              disabled={isSelf}
              title={isSelf ? t("cannotDeleteSelf") : undefined}
              onClick={() => !isSelf && onDelete(row.original.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];
}
