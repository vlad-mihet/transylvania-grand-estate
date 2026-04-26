"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Button } from "@tge/ui";
import { Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ApiTestimonial } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { RowActions } from "@/components/shared/row-actions";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { Can } from "@/components/shared/can";
import { useResourceList } from "@/hooks/use-resource-list";

type Testimonial = ApiTestimonial & {
  createdAt?: string;
  updatedAt?: string;
  // `quote` may arrive as a string or localized object depending on whether
  // the raw DB row hasn't been through the API Zod schema yet.
  quote: ApiTestimonial["quote"] | string;
};

const SORT_TOKENS = {
  createdAt: { asc: "oldest", desc: "newest" },
  rating: { asc: "rating_asc", desc: "rating_desc" },
} as const;

export default function TestimonialsPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Testimonials");
  const tc = useTranslations("Common");
  const locale = useLocale();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const list = useResourceList<Testimonial>({
    resource: "testimonials",
    defaultSort: "newest",
    defaultLimit: 20,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/testimonials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          apiClient(`/testimonials/${id}`, { method: "DELETE" }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success(t("deleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const getQuote = (value: Testimonial["quote"]): string => {
    if (typeof value === "string") return value;
    if (!value) return "";
    const lookup = value as Record<string, string>;
    return lookup[locale] ?? lookup.en ?? "";
  };

  const columns: ColumnDef<Testimonial, unknown>[] = [
    {
      id: "clientName",
      header: t("columnClient"),
      cell: ({ row }) => (
        <p className="truncate text-sm font-medium text-foreground">
          {row.original.clientName}
        </p>
      ),
    },
    {
      id: "location",
      header: t("columnLocation"),
      cell: ({ row }) => <MonoTag>{row.original.location}</MonoTag>,
    },
    {
      id: "propertyType",
      header: t("columnPropertyType"),
      cell: ({ row }) => (
        <span className="text-xs capitalize text-foreground/80">
          {row.original.propertyType.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "rating",
      header: t("columnRating"),
      cell: ({ row }) => (
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={
                i < row.original.rating
                  ? "h-3.5 w-3.5 fill-copper text-copper"
                  : "h-3.5 w-3.5 text-muted-foreground/30"
              }
            />
          ))}
        </div>
      ),
    },
    {
      id: "quote",
      header: t("columnQuote"),
      enableSorting: false,
      cell: ({ row }) => (
        <p className="max-w-[320px] truncate text-sm text-muted-foreground">
          {getQuote(row.original.quote)}
        </p>
      ),
    },
    {
      id: "createdAt",
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
          viewHref={`/testimonials/${row.original.id}`}
          editHref={`/testimonials/${row.original.id}/edit`}
          onDelete={() => setDeleteId(row.original.id)}
          permissions={{
            edit: "testimonial.update",
            delete: "testimonial.delete",
          }}
        />
      ),
    },
  ];

  return (
    <>
      <ResourceListPage<Testimonial>
        title={t("title")}
        createHref="/testimonials/new"
        createLabel={t("addTestimonial")}
        createAction="testimonial.create"
        list={list}
        columns={columns}
        sortTokens={SORT_TOKENS}
        sortOptions={[
          { value: "newest", label: tc("sortNewest") },
          { value: "oldest", label: tc("sortOldest") },
          { value: "rating_desc", label: tc("sortRatingDesc") },
          { value: "rating_asc", label: tc("sortRatingAsc") },
        ]}
        emptyAction={
          <Can action="testimonial.create">
            <Button asChild size="sm">
              <Link href="/testimonials/new">{t("addTestimonial")}</Link>
            </Button>
          </Can>
        }
        bulkActions={() => (
          <Can action="testimonial.delete">
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
        mobileCard={(testimonial) => (
          <Link
            href={`/testimonials/${testimonial.id}`}
            className="card-hover block space-y-2 rounded-md border border-border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {testimonial.clientName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {testimonial.location} · {testimonial.propertyType}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-copper text-copper" />
                ))}
              </div>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {getQuote(testimonial.quote)}
            </p>
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
