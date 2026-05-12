"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { Loader2, Plus, RefreshCw } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Can } from "@/components/shared/can";

interface BnrSyncResult {
  success: boolean;
  value?: number;
  error?: string;
}

/**
 * Quick-action cluster for the Finance home. "Refresh BNR" mirrors the
 * mutation already used by the financial-indicators page — same endpoint,
 * same query-key invalidation — so triggering from either surface keeps
 * tiles in sync.
 */
export function FinanceQuickActions() {
  const t = useTranslations("Finance.home.actions");
  const tt = useTranslations("Finance.home.toasts");
  const queryClient = useQueryClient();

  const syncBnr = useMutation({
    mutationFn: () =>
      apiClient<BnrSyncResult>("/financial-data/sync-bnr", {
        method: "POST",
      }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(tt("bnrSyncSuccess", { value: result.value ?? 0 }));
        queryClient.invalidateQueries({ queryKey: ["financial-indicators"] });
      } else {
        toast.error(tt("bnrSyncFailed", { reason: result.error ?? "unknown" }));
      }
    },
    onError: (err) => {
      const reason =
        err instanceof ApiError ? err.message : tt("bnrSyncUnknownError");
      toast.error(tt("bnrSyncFailed", { reason }));
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can action="bank-rate.create">
        <Button asChild size="sm">
          <Link href="/bank-rates/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("newBankRate")}
          </Link>
        </Button>
      </Can>
      <Can action="financial-indicator.update">
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncBnr.mutate()}
          disabled={syncBnr.isPending}
        >
          {syncBnr.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          {t("refreshBnr")}
        </Button>
      </Can>
    </div>
  );
}
