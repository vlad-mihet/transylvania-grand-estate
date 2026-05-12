"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@tge/ui";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ApiCounty } from "@tge/types";
import type { ColumnDef } from "@/components/resource/resource-table";
import { Can } from "@/components/shared/can";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RowActions } from "@/components/shared/row-actions";

export type County = ApiCounty & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  cities?: { id: string }[];
};

interface BuildColumnsArgs {
  onEdit: (county: County) => void;
  onDelete: (id: string) => void;
  t: (key: string, values?: Record<string, string>) => string;
}

function EditCountyButton({ onClick }: { onClick: () => void }) {
  const tc = useTranslations("Common");
  return (
    <Can action="county.update">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={tc("edit")}
            onClick={onClick}
          >
            <Pencil />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tc("edit")}</TooltipContent>
      </Tooltip>
    </Can>
  );
}

export function buildCountyColumns({
  onEdit,
  onDelete,
  t,
}: BuildColumnsArgs): ColumnDef<County, unknown>[] {
  return [
    {
      id: "name",
      header: t("columnName"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.name}
          </p>
          <Mono className="truncate text-[11px] text-muted-foreground">
            {row.original.slug}
          </Mono>
        </div>
      ),
    },
    {
      id: "code",
      header: t("columnCode"),
      cell: ({ row }) => <MonoTag>{row.original.code}</MonoTag>,
    },
    {
      id: "cities",
      header: t("columnCities"),
      enableSorting: false,
      cell: ({ row }) => (
        <Mono className="text-foreground">
          {row.original.cities?.length ?? 0}
        </Mono>
      ),
    },
    {
      id: "coords",
      header: t("columnCoords"),
      enableSorting: false,
      cell: ({ row }) => (
        <Mono className="text-muted-foreground">
          {row.original.latitude.toFixed(3)}, {row.original.longitude.toFixed(3)}
        </Mono>
      ),
    },
    {
      id: "propertyCount",
      header: t("columnProperties"),
      cell: ({ row }) => (
        <Mono className="text-foreground">{row.original.propertyCount}</Mono>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 80,
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          onDelete={() => onDelete(row.original.id)}
          permissions={{ delete: "county.delete" }}
          extra={<EditCountyButton onClick={() => onEdit(row.original)} />}
        />
      ),
    },
  ];
}
