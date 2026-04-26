"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tge/ui";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Mono, MonoTag } from "@/components/shared/mono";
import { StatusBadge } from "@/components/shared/status-badge";
import { Can } from "@/components/shared/can";
import { useResourceList } from "@/hooks/use-resource-list";

import { buildBankRateColumns } from "./_components/columns";
import { BankRatesFilterRail } from "./_components/filters";
import type { BankRate, RateType } from "./_components/types";

export default function BankRatesPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("BankRates");
  const tf = useTranslations("BankRateForm");
  const tc = useTranslations("Common");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [rateTypeFilter, setRateTypeFilter] = useState<RateType | "">("");
  const [activeFilter, setActiveFilter] = useState<"active" | "inactive" | "">(
    "",
  );

  const list = useResourceList<BankRate>({
    resource: "bank-rates",
    endpoint: "/financial-data/bank-rates",
    defaultLimit: 100,
    extraParams: {
      all: true,
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["bank-rates"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/financial-data/bank-rates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          apiClient(`/financial-data/bank-rates/${id}`, { method: "DELETE" }),
        ),
      );
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("deleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient(`/financial-data/bank-rates/${id}`, {
        method: "PATCH",
        body: { active },
      }),
    onSuccess: () => invalidate(),
    onError: () => {
      toast.error(tc("featuredError"));
      invalidate();
    },
  });

  // Client-side filter — the bank-rates endpoint doesn't yet understand
  // `rateType` / `active` query params, and with < 50 rows a local filter
  // keeps the UI snappy without extending the API surface in this chunk.
  const filteredItems = list.items.filter((row) => {
    if (rateTypeFilter && row.rateType !== rateTypeFilter) return false;
    if (activeFilter === "active" && !row.active) return false;
    if (activeFilter === "inactive" && row.active) return false;
    return true;
  });

  const columns = buildBankRateColumns({
    onToggleActive: toggleActive.mutate,
    onDelete: (id) => setDeleteId(id),
    t: (k) => t(k as Parameters<typeof t>[0]),
    tf: (k) => tf(k as Parameters<typeof tf>[0]),
    tfHas: (k) => tf.has(k as Parameters<typeof tf.has>[0]),
    tc: (k) => tc(k as Parameters<typeof tc>[0]),
  });

  const activeFilterCount =
    (rateTypeFilter ? 1 : 0) + (activeFilter ? 1 : 0);

  return (
    <>
      <ResourceListPage<BankRate>
        title={t("title")}
        createHref="/bank-rates/new"
        createLabel={t("addBankRate")}
        createAction="bank-rate.create"
        list={{ ...list, items: filteredItems }}
        columns={columns}
        activeFilters={activeFilterCount}
        filterRail={
          <BankRatesFilterRail
            rateTypeFilter={rateTypeFilter}
            activeFilter={activeFilter}
            onRateTypeChange={setRateTypeFilter}
            onActiveChange={setActiveFilter}
            activeCount={activeFilterCount}
          />
        }
        emptyAction={
          <Can action="bank-rate.create">
            <Button asChild size="sm">
              <Link href="/bank-rates/new">{t("addBankRate")}</Link>
            </Button>
          </Can>
        }
        bulkActions={() => (
          <Can action="bank-rate.delete">
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
        mobileCard={(rate) => (
          <Link
            href={`/bank-rates/${rate.id}`}
            className="card-hover block space-y-2 rounded-md border border-border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{rate.bankName}</p>
                {rate.notes && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {rate.notes}
                  </p>
                )}
              </div>
              <Mono className="shrink-0 text-base font-semibold text-foreground">
                {rate.rate.toFixed(2)}%
              </Mono>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <MonoTag>
                {tf.has(`types.${rate.rateType}` as Parameters<typeof tf.has>[0])
                  ? tf(`types.${rate.rateType}` as Parameters<typeof tf>[0])
                  : rate.rateType.replace(/_/g, " ")}
              </MonoTag>
              <StatusBadge status={rate.active ? "active" : "inactive"} />
              {rate.maxTermYears && (
                <Mono className="text-[11px] text-muted-foreground">
                  {rate.maxTermYears}y
                </Mono>
              )}
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
