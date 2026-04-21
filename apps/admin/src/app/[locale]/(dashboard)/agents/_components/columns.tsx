"use client";

import { Button, Switch, Tooltip, TooltipContent, TooltipTrigger } from "@tge/ui";
import { Send } from "lucide-react";
import type { ColumnDef } from "@/components/resource/resource-table";
import { Avatar } from "@/components/shared/avatar";
import { Can } from "@/components/shared/can";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { RowActions } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ACCOUNT_STATUS_KEY,
  ACCOUNT_STATUS_TONE,
  canSendInvite,
  resolveAccountStatus,
  type Agent,
} from "./account-status";

interface BuildColumnsArgs {
  onToggleActive: (args: { id: string; active: boolean }) => void;
  onDelete: (id: string) => void;
  onInvite: (agent: Agent) => void;
  t: (key: string) => string;
  ti: (key: string) => string;
  tc: (key: string) => string;
}

export function buildAgentColumns({
  onToggleActive,
  onDelete,
  onInvite,
  t,
  ti,
  tc,
}: BuildColumnsArgs): ColumnDef<Agent, unknown>[] {
  return [
    {
      id: "photo",
      header: "",
      size: 48,
      enableSorting: false,
      cell: ({ row }) => (
        <Avatar
          src={row.original.photo}
          alt={`${row.original.firstName} ${row.original.lastName}`}
          size="sm"
        />
      ),
    },
    {
      id: "name",
      header: t("columnName"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.firstName} {row.original.lastName}
          </p>
          <Mono className="truncate text-[11px] text-muted-foreground">
            {row.original.slug}
          </Mono>
        </div>
      ),
    },
    {
      id: "email",
      header: t("columnEmail"),
      cell: ({ row }) => (
        <span className="truncate text-sm text-foreground/80">
          {row.original.email}
        </span>
      ),
    },
    {
      id: "phone",
      header: t("columnPhone"),
      cell: ({ row }) => (
        <Mono className="text-foreground/80">{row.original.phone}</Mono>
      ),
    },
    {
      id: "accountStatus",
      header: t("columnAccount"),
      enableSorting: false,
      size: 140,
      cell: ({ row }) => {
        const status = resolveAccountStatus(row.original);
        return (
          <StatusBadge
            status={ti(ACCOUNT_STATUS_KEY[status])}
            tone={ACCOUNT_STATUS_TONE[status]}
          />
        );
      },
    },
    {
      id: "active",
      header: t("columnActive"),
      enableSorting: false,
      cell: ({ row }) => (
        <Can
          action="agent.update"
          fallback={
            <StatusBadge status={row.original.active ? "active" : "inactive"} />
          }
        >
          <Switch
            checked={row.original.active}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(checked) =>
              onToggleActive({ id: row.original.id, active: checked })
            }
          />
        </Can>
      ),
    },
    {
      id: "updatedAt",
      header: tc("columnUpdated"),
      cell: ({ row }) =>
        row.original.updatedAt || row.original.createdAt ? (
          <RelativeTime
            value={row.original.updatedAt ?? row.original.createdAt!}
          />
        ) : (
          <Mono>—</Mono>
        ),
    },
    {
      id: "actions",
      header: "",
      size: 140,
      enableSorting: false,
      cell: ({ row }) => {
        const status = resolveAccountStatus(row.original);
        const showInvite = canSendInvite(status);
        return (
          <RowActions
            viewHref={`/agents/${row.original.id}`}
            editHref={`/agents/${row.original.id}/edit`}
            onDelete={() => onDelete(row.original.id)}
            permissions={{
              edit: "agent.update",
              delete: "agent.delete",
            }}
            extra={
              showInvite && (
                <Can action="agent.create">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-foreground/60 hover:text-foreground"
                        aria-label={ti("sendInvite")}
                        onClick={() => onInvite(row.original)}
                      >
                        <Send />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{ti("sendInvite")}</TooltipContent>
                  </Tooltip>
                </Can>
              )
            }
          />
        );
      },
    },
  ];
}
