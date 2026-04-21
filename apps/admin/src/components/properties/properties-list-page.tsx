"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Button, Switch } from "@tge/ui";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatPrice } from "@tge/utils";
import type { ApiProperty as Property } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { RowActions } from "@/components/shared/row-actions";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { Can } from "@/components/shared/can";
import { Thumbnail } from "@/components/shared/thumbnail";
import { useResourceList } from "@/hooks/use-resource-list";

const SORT_TOKENS = {
  price: { asc: "price_asc", desc: "price_desc" },
  createdAt: { asc: "oldest", desc: "newest" },
} as const;

interface PropertiesListPageProps {
  /** Page header title. Defaults to `Properties.title`. */
  title?: string;
  /** When set, renders a primary "create" action in the page header. Omit for
   *  the AGENT view where listings are assigned by admins. */
  createHref?: string;
  createLabel?: string;
}

/**
 * Shared body of the properties list view. Used by `/properties` (admin
 * surface) and `/my-listings` (agent surface, which just trims the create
 * action — `<Can>` already hides delete/featured for AGENT). The underlying
 * `/properties` API auto-scopes for AGENT so the same data-fetching path
 * serves both.
 */
export function PropertiesListPage({
  title,
  createHref,
  createLabel,
}: PropertiesListPageProps = {}) {
  const queryClient = useQueryClient();
  const t = useTranslations("Properties");
  const tc = useTranslations("Common");
  const locale = useLocale();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const list = useResourceList<Property>({
    resource: "properties",
    defaultSort: "newest",
    defaultLimit: 20,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/properties/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiClient(`/properties/${id}`, { method: "DELETE" })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success(t("deleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      apiClient(`/properties/${id}`, { method: "PATCH", body: { featured } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["properties"] }),
    onError: () => {
      toast.error(tc("featuredError"));
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  const getTitle = (p: Property): string =>
    (p.title as Record<string, string>)[locale] ?? p.title.en;

  const columns: ColumnDef<Property, unknown>[] = [
    {
      id: "hero",
      header: "",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => {
        const hero =
          row.original.images?.find((i) => i.isHero) ?? row.original.images?.[0];
        return hero ? (
          <div className="relative h-9 w-12 overflow-hidden rounded-sm bg-muted">
            <Image
              src={hero.src}
              alt={
                (hero.alt as Record<string, string>)[locale] ??
                hero.alt.en ??
                ""
              }
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-9 w-12 rounded-sm bg-muted" />
        );
      },
    },
    {
      id: "title",
      header: t("columnTitle"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {getTitle(row.original)}
          </p>
          <Mono className="truncate text-[11px] text-muted-foreground">
            {row.original.slug}
          </Mono>
        </div>
      ),
    },
    {
      id: "city",
      header: t("columnCity"),
      cell: ({ row }) => <MonoTag>{row.original.city}</MonoTag>,
    },
    {
      id: "type",
      header: t("columnType"),
      cell: ({ row }) => (
        <span className="text-xs capitalize text-foreground/80">
          {row.original.type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "price",
      header: t("columnPrice"),
      cell: ({ row }) => (
        <Mono className="text-foreground">{formatPrice(row.original.price)}</Mono>
      ),
    },
    {
      id: "status",
      header: t("columnStatus"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "featured",
      header: t("columnFeatured"),
      enableSorting: false,
      cell: ({ row }) => (
        <Can
          action="property.feature"
          fallback={
            row.original.featured ? <StatusBadge status="active" /> : null
          }
        >
          <Switch
            checked={row.original.featured}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(checked) =>
              toggleFeatured.mutate({ id: row.original.id, featured: checked })
            }
          />
        </Can>
      ),
    },
    {
      id: "updatedAt",
      header: t("columnUpdated"),
      cell: ({ row }) => (
        <RelativeTime value={row.original.updatedAt ?? row.original.createdAt} />
      ),
    },
    {
      id: "actions",
      header: "",
      size: 112,
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          viewHref={`/properties/${row.original.id}`}
          editHref={`/properties/${row.original.id}/edit`}
          onDelete={() => setDeleteId(row.original.id)}
          permissions={{
            edit: "property.update",
            delete: "property.delete",
          }}
          resource={row.original}
        />
      ),
    },
  ];

  return (
    <>
      <ResourceListPage<Property>
        title={title ?? t("title")}
        createHref={createHref}
        createLabel={createLabel}
        list={list}
        columns={columns}
        sortTokens={SORT_TOKENS}
        sortOptions={[
          { value: "newest", label: tc("sortNewest") },
          { value: "oldest", label: tc("sortOldest") },
          { value: "price_desc", label: tc("sortPriceDesc") },
          { value: "price_asc", label: tc("sortPriceAsc") },
        ]}
        emptyTitle={tc("emptyTitle")}
        emptyAction={
          <Can action="property.create">
            <Button asChild size="sm">
              <Link href="/properties/new">{t("addProperty")}</Link>
            </Button>
          </Can>
        }
        bulkActions={(selection) => (
          <Can action="property.delete">
            <Button
              variant="outline"
              size="sm"
              className="text-[var(--color-danger)] border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] hover:bg-[var(--color-danger-bg)]"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={selection.size === 0}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {tc("delete")}
            </Button>
          </Can>
        )}
        mobileCard={(property) => {
          const hero =
            property.images?.find((i) => i.isHero) ?? property.images?.[0];
          return (
            <Link
              href={`/properties/${property.id}`}
              className="block space-y-3 rounded-md border border-border bg-card p-3 card-hover"
            >
              <div className="flex gap-3">
                <Thumbnail
                  src={hero?.src}
                  alt={
                    hero
                      ? (hero.alt as Record<string, string>)[locale] ??
                        hero.alt.en ??
                        ""
                      : ""
                  }
                  size="md"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {getTitle(property)}
                  </p>
                  <Mono className="truncate text-[11px]">{property.slug}</Mono>
                </div>
                <Mono className="whitespace-nowrap text-sm font-semibold text-foreground">
                  {formatPrice(property.price)}
                </Mono>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <MonoTag>{property.city}</MonoTag>
                <StatusBadge status={property.status} />
                {property.featured && <StatusBadge status="active" />}
              </div>
            </Link>
          );
        }}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        loading={deleteMutation.isPending}
      />

      <DeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(list.selection))}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        loading={bulkDeleteMutation.isPending}
      />
    </>
  );
}
