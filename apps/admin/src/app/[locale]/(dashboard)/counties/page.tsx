"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tge/ui";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Can } from "@/components/shared/can";
import { useAuth } from "@/components/auth/auth-provider";
import { useResourceList } from "@/hooks/use-resource-list";

import {
  SORT_TOKENS,
  type SiteConfigScope,
} from "./_components/constants";
import { buildCountyColumns, type County } from "./_components/columns";
import {
  CreateCountyDialog,
  type CountyCreatePayload,
} from "./_components/create-county-dialog";
import { ScopePresets } from "./_components/scope-presets";

export default function CountiesPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Counties");
  const tc = useTranslations("Common");
  const { can } = useAuth();
  const canEditScope = can("site-config.update");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const list = useResourceList<County>({
    resource: "counties",
    defaultSort: "name_asc",
    defaultLimit: 50,
  });

  // TGE geo scope lives on the SiteConfig singleton (see
  // apps/api/src/common/site/geo-scope.util.ts). Reading it here lets each
  // row render its "Visible on TGE" checkbox in the same render pass as the
  // county data, instead of routing the admin to a separate Settings screen.
  const { data: siteConfig } = useQuery({
    queryKey: ["site-config"],
    queryFn: () => apiClient<SiteConfigScope>("/site-config"),
  });
  const scopeSet = useMemo(
    () => new Set(siteConfig?.tgeCountyScope ?? []),
    [siteConfig?.tgeCountyScope],
  );

  // Per-row toggle. Hits the dedicated POST/DELETE endpoints (not PATCH with
  // the whole array) so two admins toggling different rows concurrently
  // can't clobber each other's edits — the API-side `array_append` /
  // `array_remove` run inside Postgres atomically. Optimistic update keeps
  // the checkbox snappy; rollback on error restores the pre-toggle state.
  const toggleScope = useMutation({
    mutationFn: ({ slug, next }: { slug: string; next: boolean }) =>
      apiClient<SiteConfigScope>(`/site-config/tge-county-scope/${slug}`, {
        method: next ? "POST" : "DELETE",
      }),
    onMutate: async ({ slug, next }) => {
      await queryClient.cancelQueries({ queryKey: ["site-config"] });
      const previous = queryClient.getQueryData<SiteConfigScope>([
        "site-config",
      ]);
      const optimistic = new Set(previous?.tgeCountyScope ?? []);
      if (next) optimistic.add(slug);
      else optimistic.delete(slug);
      queryClient.setQueryData<SiteConfigScope>(["site-config"], {
        ...(previous ?? {}),
        tgeCountyScope: Array.from(optimistic).sort(),
      });
      return { previous };
    },
    onSuccess: (updated) => {
      // Server is authoritative — write the canonical result back into the
      // cache so optimistic sort order matches what every other client sees.
      queryClient.setQueryData<SiteConfigScope>(["site-config"], updated);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(["site-config"], ctx.previous);
      }
      toast.error(t("tgeScopeToggleFailed"));
    },
  });

  // Preset swap (strict ↔ extended ↔ clear). Whole-array replace is the
  // right operation here: admin intent is "set the list to exactly X".
  const applyPreset = useMutation({
    mutationFn: (nextScope: string[]) =>
      apiClient<SiteConfigScope>("/site-config", {
        method: "PATCH",
        body: { tgeCountyScope: nextScope },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<SiteConfigScope>(["site-config"], updated);
      toast.success(t("tgeScopePresetApplied"));
    },
    onError: () => toast.error(t("tgeScopeToggleFailed")),
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
    scopeSet,
    canEditScope,
    toggleScopePending: toggleScope.isPending,
    onToggleScope: toggleScope.mutate,
    onDelete: (id) => setDeleteId(id),
    t: (k, v) =>
      t(
        k as Parameters<typeof t>[0],
        v as Parameters<typeof t>[1],
      ),
  });

  const presetsPending = applyPreset.isPending || toggleScope.isPending;

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
          <div className="flex items-center gap-2">
            <ScopePresets
              activeCount={scopeSet.size}
              onApply={(slugs) => applyPreset.mutate(slugs)}
              isPending={presetsPending}
            />
            <Can action="county.create">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("addCounty")}
              </Button>
            </Can>
          </div>
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
