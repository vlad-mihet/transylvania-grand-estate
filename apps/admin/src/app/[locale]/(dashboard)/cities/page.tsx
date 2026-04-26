"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Button } from "@tge/ui";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ApiCity, ApiCounty } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { RowActions } from "@/components/shared/row-actions";
import { Mono, MonoTag } from "@/components/shared/mono";
import { Thumbnail } from "@/components/shared/thumbnail";
import { RelativeTime } from "@/components/shared/relative-time";
import { Can } from "@/components/shared/can";
import {
  FilterCheckbox,
  FilterGroup,
  FilterRail,
} from "@/components/shared/filter-rail";
import { useResourceList } from "@/hooks/use-resource-list";

type City = ApiCity & { id: string; createdAt?: string; updatedAt?: string };

const SORT_TOKENS = {
  name: { asc: "name_asc", desc: "name_desc" },
  createdAt: { asc: "oldest", desc: "newest" },
  propertyCount: { asc: "propertyCount_asc", desc: "propertyCount_desc" },
} as const;

export default function CitiesPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Cities");
  const tc = useTranslations("Common");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [countyFilter, setCountyFilter] = useState<string>("");

  // County facet — counties are a closed set (~42 rows for RO), fetch once
  // with the `light` flag so the filter rail doesn't blow up the payload.
  const { data: countiesRaw } = useQuery({
    queryKey: ["counties", { light: true }],
    queryFn: () => apiClient<ApiCounty[]>("/counties?light=true"),
  });
  const counties = useMemo<ApiCounty[]>(
    () => (Array.isArray(countiesRaw) ? countiesRaw : []),
    [countiesRaw],
  );

  const list = useResourceList<City>({
    resource: "cities",
    defaultSort: "name_asc",
    defaultLimit: 20,
    extraParams: { county: countyFilter || undefined },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/cities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiClient(`/cities/${id}`, { method: "DELETE" })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast.success(t("deleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const columns: ColumnDef<City, unknown>[] = [
    {
      id: "image",
      header: "",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => (
        <Thumbnail
          src={row.original.image}
          alt={row.original.name}
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
            {row.original.name}
          </p>
          <Mono className="truncate text-[11px] text-muted-foreground">
            {row.original.slug}
          </Mono>
        </div>
      ),
    },
    {
      id: "county",
      header: t("columnCounty"),
      cell: ({ row }) =>
        row.original.county ? (
          <div className="flex items-center gap-1.5">
            <MonoTag>{row.original.county.code}</MonoTag>
            <span className="text-sm text-foreground/80">
              {row.original.county.name}
            </span>
          </div>
        ) : (
          <Mono>—</Mono>
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
          viewHref={`/cities/${row.original.id}`}
          editHref={`/cities/${row.original.id}/edit`}
          onDelete={() => setDeleteId(row.original.id)}
          permissions={{
            edit: "city.update",
            delete: "city.delete",
          }}
        />
      ),
    },
  ];

  const activeFilters = countyFilter ? 1 : 0;

  return (
    <>
      <ResourceListPage<City>
        title={t("title")}
        createHref="/cities/new"
        createLabel={t("addCity")}
        createAction="city.create"
        list={list}
        columns={columns}
        sortTokens={SORT_TOKENS}
        sortOptions={[
          { value: "name_asc", label: tc("sortNameAsc") },
          { value: "name_desc", label: tc("sortNameDesc") },
          { value: "propertyCount_desc", label: tc("sortPropertiesDesc") },
          { value: "newest", label: tc("sortNewest") },
          { value: "oldest", label: tc("sortOldest") },
        ]}
        activeFilters={activeFilters}
        filterRail={
          <FilterRail
            activeCount={activeFilters}
            onClear={() => setCountyFilter("")}
          >
            <FilterGroup title={t("columnCounty")}>
              {counties.map((c) => (
                <FilterCheckbox
                  key={c.id}
                  label={`${c.code} · ${c.name}`}
                  checked={countyFilter === c.slug}
                  onChange={(checked) =>
                    setCountyFilter(checked ? c.slug : "")
                  }
                />
              ))}
            </FilterGroup>
          </FilterRail>
        }
        emptyAction={
          <Can action="city.create">
            <Button asChild size="sm">
              <Link href="/cities/new">{t("addCity")}</Link>
            </Button>
          </Can>
        }
        bulkActions={() => (
          <Can action="city.delete">
            <Button
              variant="outline"
              size="sm"
              className="border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {tc("delete")}
            </Button>
          </Can>
        )}
        mobileCard={(city) => (
          <Link
            href={`/cities/${city.id}`}
            className="card-hover block space-y-2 rounded-md border border-border bg-card p-3"
          >
            <div className="flex items-center gap-3">
              <Thumbnail src={city.image} alt={city.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{city.name}</p>
                <Mono className="truncate text-[11px]">{city.slug}</Mono>
              </div>
              <Mono className="shrink-0 text-sm text-foreground">
                {city.propertyCount}
              </Mono>
            </div>
            {city.county && (
              <div className="flex items-center gap-1.5">
                <MonoTag>{city.county.code}</MonoTag>
                <span className="text-xs text-muted-foreground">
                  {city.county.name}
                </span>
              </div>
            )}
          </Link>
        )}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("deleteTitle")}
        loading={deleteMutation.isPending}
      />

      <DeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(list.selection))}
        title={t("deleteTitle")}
        loading={bulkDeleteMutation.isPending}
      />
    </>
  );
}
