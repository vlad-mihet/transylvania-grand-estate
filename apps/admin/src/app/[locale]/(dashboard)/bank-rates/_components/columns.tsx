"use client";

import { Switch } from "@tge/ui";
import type { ColumnDef } from "@/components/resource/resource-table";
import { Can } from "@/components/shared/can";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { RowActions } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import type { BankRate } from "./types";

type HasFn = (key: string) => boolean;

interface BuildColumnsArgs {
  onToggleActive: (args: { id: string; active: boolean }) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
  /** BankRateForm translator — has/label pair for rate-type labels. */
  tf: (key: string) => string;
  tfHas: HasFn;
  tc: (key: string) => string;
}

export function buildBankRateColumns({
  onToggleActive,
  onDelete,
  t,
  tf,
  tfHas,
  tc,
}: BuildColumnsArgs): ColumnDef<BankRate, unknown>[] {
  return [
    {
      id: "bankName",
      header: t("columnBank"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.bankName}
          </p>
          {row.original.notes && (
            <p className="truncate text-[11px] text-muted-foreground">
              {row.original.notes}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "rate",
      header: t("columnRate"),
      cell: ({ row }) => (
        <Mono className="text-foreground">
          {row.original.rate.toFixed(2)}%
        </Mono>
      ),
    },
    {
      id: "rateType",
      header: t("columnType"),
      cell: ({ row }) => (
        <MonoTag>
          {tfHas(`types.${row.original.rateType}`)
            ? tf(`types.${row.original.rateType}`)
            : row.original.rateType.replace(/_/g, " ")}
        </MonoTag>
      ),
    },
    {
      id: "maxLtv",
      header: t("columnMaxLtv"),
      cell: ({ row }) =>
        row.original.maxLtv != null ? (
          <Mono className="text-muted-foreground">
            {Math.round(row.original.maxLtv * 100)}%
          </Mono>
        ) : (
          <Mono>—</Mono>
        ),
    },
    {
      id: "maxTermYears",
      header: t("columnMaxTerm"),
      cell: ({ row }) =>
        row.original.maxTermYears != null ? (
          <Mono className="text-muted-foreground">
            {row.original.maxTermYears}y
          </Mono>
        ) : (
          <Mono>—</Mono>
        ),
    },
    {
      id: "sortOrder",
      header: t("columnOrder"),
      cell: ({ row }) => (
        <Mono className="text-muted-foreground">{row.original.sortOrder}</Mono>
      ),
    },
    {
      id: "active",
      header: t("columnActive"),
      enableSorting: false,
      cell: ({ row }) => (
        <Can
          action="bank-rate.update"
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
      size: 112,
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          viewHref={`/bank-rates/${row.original.id}`}
          editHref={`/bank-rates/${row.original.id}/edit`}
          onDelete={() => onDelete(row.original.id)}
          permissions={{
            edit: "bank-rate.update",
            delete: "bank-rate.delete",
          }}
        />
      ),
    },
  ];
}
