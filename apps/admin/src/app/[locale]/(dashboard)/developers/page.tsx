"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Button, Switch } from "@tge/ui";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ApiDeveloper } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { Avatar } from "@/components/shared/avatar";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { RowActions } from "@/components/shared/row-actions";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { Can } from "@/components/shared/can";
import { useResourceList } from "@/hooks/use-resource-list";

type Developer = ApiDeveloper & { createdAt?: string; updatedAt?: string };

const SORT_TOKENS = {
  name: { asc: "name_asc", desc: "name_desc" },
  createdAt: { asc: "oldest", desc: "newest" },
} as const;

export default function DevelopersPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Developers");
  const tc = useTranslations("Common");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const list = useResourceList<Developer>({
    resource: "developers",
    defaultSort: "name_asc",
    defaultLimit: 20,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/developers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developers"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiClient(`/developers/${id}`, { method: "DELETE" })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developers"] });
      toast.success(t("deleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      apiClient(`/developers/${id}`, { method: "PATCH", body: { featured } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["developers"] }),
    onError: () => {
      toast.error(tc("featuredError"));
      queryClient.invalidateQueries({ queryKey: ["developers"] });
    },
  });

  const columns: ColumnDef<Developer, unknown>[] = [
    {
      id: "logo",
      header: "",
      size: 48,
      enableSorting: false,
      cell: ({ row }) => (
        <Avatar
          src={row.original.logo}
          alt={row.original.name}
          size="sm"
          shape="square"
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
      id: "city",
      header: t("columnCity"),
      cell: ({ row }) => <MonoTag>{row.original.city}</MonoTag>,
    },
    {
      id: "projectCount",
      header: t("columnProjects"),
      cell: ({ row }) => (
        <Mono className="text-foreground">{row.original.projectCount}</Mono>
      ),
    },
    {
      id: "featured",
      header: t("columnFeatured"),
      enableSorting: false,
      cell: ({ row }) => (
        <Can
          action="developer.update"
          fallback={row.original.featured ? <MonoTag>★</MonoTag> : null}
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
      header: tc("columnUpdated"),
      cell: ({ row }) =>
        row.original.updatedAt || row.original.createdAt ? (
          <RelativeTime value={row.original.updatedAt ?? row.original.createdAt!} />
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
          viewHref={`/developers/${row.original.id}`}
          editHref={`/developers/${row.original.id}/edit`}
          onDelete={() => setDeleteId(row.original.id)}
          permissions={{
            edit: "developer.update",
            delete: "developer.delete",
          }}
        />
      ),
    },
  ];

  return (
    <>
      <ResourceListPage<Developer>
        title={t("title")}
        createHref="/developers/new"
        createLabel={t("addDeveloper")}
        list={list}
        columns={columns}
        sortTokens={SORT_TOKENS}
        sortOptions={[
          { value: "name_asc", label: tc("sortNameAsc") },
          { value: "name_desc", label: tc("sortNameDesc") },
          { value: "newest", label: tc("sortNewest") },
          { value: "oldest", label: tc("sortOldest") },
          { value: "featured", label: tc("sortFeatured") },
        ]}
        emptyAction={
          <Can action="developer.create">
            <Button asChild size="sm">
              <Link href="/developers/new">{t("addDeveloper")}</Link>
            </Button>
          </Can>
        }
        bulkActions={() => (
          <Can action="developer.delete">
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
        mobileCard={(developer) => (
          <Link
            href={`/developers/${developer.id}`}
            className="card-hover block space-y-2 rounded-md border border-border bg-card p-3"
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={developer.logo}
                alt={developer.name}
                size="md"
                shape="square"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{developer.name}</p>
                <Mono className="truncate text-[11px]">{developer.slug}</Mono>
              </div>
              <Mono className="shrink-0 text-sm text-foreground">
                {developer.projectCount}
              </Mono>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <MonoTag>{developer.city}</MonoTag>
              {developer.featured && <MonoTag>★ Featured</MonoTag>}
            </div>
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
