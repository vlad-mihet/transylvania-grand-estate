"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tge/ui";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Can } from "@/components/shared/can";
import { useResourceList } from "@/hooks/use-resource-list";

import { SORT_TOKENS } from "./_components/constants";
import { buildCountyColumns, type County } from "./_components/columns";
import {
  CreateCountyDialog,
  type CountyCreatePayload,
} from "./_components/create-county-dialog";

export default function CountiesPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Counties");
  const tc = useTranslations("Common");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Counties are universal across brands (TGE + Revery both consume the
  // full set as a public-site filter facet), so this page is plain CRUD —
  // no brand toggles, no per-row visibility checkbox.
  const list = useResourceList<County>({
    resource: "counties",
    defaultSort: "name_asc",
    defaultLimit: 50,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/counties/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiClient(`/counties/${id}`, { method: "DELETE" })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      toast.success(t("deleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CountyCreatePayload) =>
      apiClient("/counties", { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      toast.success(t("created"));
      setCreateOpen(false);
    },
    onError: () => toast.error(t("createFailed")),
  });

  const columns = buildCountyColumns({
    onDelete: (id) => setDeleteId(id),
    t: (k, v) =>
      t(
        k as Parameters<typeof t>[0],
        v as Parameters<typeof t>[1],
      ),
  });

  return (
    <>
      <ResourceListPage<County>
        title={t("title")}
        list={list}
        columns={columns}
        sortTokens={SORT_TOKENS}
        sortOptions={[
          { value: "name_asc", label: tc("sortNameAsc") },
          { value: "name_desc", label: tc("sortNameDesc") },
          { value: "code_asc", label: tc("sortCodeAsc") },
          { value: "code_desc", label: tc("sortCodeDesc") },
          { value: "newest", label: tc("sortNewest") },
          { value: "oldest", label: tc("sortOldest") },
        ]}
        headerActions={
          <Can action="county.create">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("addCounty")}
            </Button>
          </Can>
        }
        emptyAction={
          <Can action="county.create">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {t("addCounty")}
            </Button>
          </Can>
        }
        bulkActions={() => (
          <Can action="county.delete">
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
      />

      <CreateCountyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isPending={createMutation.isPending}
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
