"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Button, Input } from "@tge/ui";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/shared/states";
import { FieldLabel } from "@/components/shared/field-label";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { Can } from "@/components/shared/can";

interface FinancialIndicator {
  id: string;
  key: string;
  value: number;
  source: string;
  sourceUrl: string | null;
  fetchedAt: string;
}

export default function FinancialIndicatorsPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("FinancialIndicators");
  const ts = useTranslations("Settings");
  const tc = useTranslations("Common");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["financial-indicators"],
    queryFn: () =>
      apiClient<FinancialIndicator[]>("/financial-data/indicators"),
  });

  const indicators = Array.isArray(data) ? data : [];
  const eurRon = indicators.find((i) => i.key === "EUR_RON");
  const ircc = indicators.find((i) => i.key === "IRCC");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")} description={t("description")} />

      {isLoading ? (
        <LoadingState label={tc("loading")} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} retryLabel={tc("retry")} />
      ) : indicators.length === 0 ? (
        <EmptyState title={tc("emptyTitle")} description={t("empty")} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <EurRonCard indicator={eurRon} label={ts("eurRon")} />
          <IrccCard indicator={ircc} label={ts("ircc")} hint={ts("irccHint")} />
        </div>
      )}
    </div>
  );

  function EurRonCard({
    indicator,
    label,
  }: {
    indicator?: FinancialIndicator;
    label: string;
  }) {
    const queryClient2 = useQueryClient();
    const ts2 = useTranslations("Settings");
    const locale = useLocale();

    const syncBnr = useMutation({
      mutationFn: () =>
        apiClient<{ success: boolean; value?: number; error?: string }>(
          "/financial-data/sync-bnr",
          { method: "POST" },
        ),
      onSuccess: (result) => {
        queryClient2.invalidateQueries({ queryKey: ["financial-indicators"] });
        if (result.success) {
          toast.success(ts2("bnrSynced", { value: result.value ?? 0 }));
        } else {
          toast.error(ts2("bnrSyncFailed", { error: result.error ?? "?" }));
        }
      },
      onError: (err) => toast.error(err.message),
    });

    return (
      <SectionCard title={label} description={t("eurRonDescription")}>
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <Mono className="text-3xl font-semibold text-foreground">
              {indicator?.value.toFixed(4) ?? "—"}
            </Mono>
            <p className="text-[11px] text-muted-foreground">
              {indicator ? (
                <>
                  <span className="mono">{indicator.source}</span>
                  <span className="mx-2 text-muted-foreground/40">·</span>
                  <RelativeTime value={indicator.fetchedAt} />
                </>
              ) : (
                t("neverSynced")
              )}
            </p>
          </div>
          <Can action="financial-indicator.update">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncBnr.mutate()}
              disabled={syncBnr.isPending}
            >
              {syncBnr.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              {ts2("syncBnr")}
            </Button>
          </Can>
        </div>
        {indicator?.sourceUrl && (
          <a
            href={indicator.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mono mt-3 block truncate text-[11px] text-muted-foreground hover:text-copper"
            lang={locale}
          >
            {indicator.sourceUrl}
          </a>
        )}
      </SectionCard>
    );
  }

  function IrccCard({
    indicator,
    label,
    hint,
  }: {
    indicator?: FinancialIndicator;
    label: string;
    hint: string;
  }) {
    const [value, setValue] = useState(
      indicator ? String(indicator.value) : "",
    );
    const [lastId, setLastId] = useState<string | null>(null);
    if (indicator && indicator.id !== lastId) {
      setLastId(indicator.id);
      setValue(String(indicator.value));
    }

    const queryClient2 = useQueryClient();
    const ts2 = useTranslations("Settings");

    const updateIrcc = useMutation({
      mutationFn: (v: number) =>
        apiClient("/financial-data/indicators/IRCC", {
          method: "PATCH",
          body: { value: v, source: "Admin" },
        }),
      onSuccess: () => {
        queryClient2.invalidateQueries({ queryKey: ["financial-indicators"] });
        toast.success(ts2("irccUpdated"));
      },
      onError: (err) => toast.error(err.message),
    });

    const parsed = parseFloat(value);
    const canSubmit =
      !Number.isNaN(parsed) &&
      parsed >= 0 &&
      indicator != null &&
      parsed !== indicator.value;

    return (
      <SectionCard title={label} description={hint}>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <FieldLabel htmlFor="ircc-value">{t("value")}</FieldLabel>
            <Input
              id="ircc-value"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mono max-w-[160px]"
            />
          </div>
          <Can action="financial-indicator.update">
            <Button
              variant="outline"
              size="sm"
              onClick={() => canSubmit && updateIrcc.mutate(parsed)}
              disabled={!canSubmit || updateIrcc.isPending}
            >
              {updateIrcc.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                ts2("updateIrcc")
              )}
            </Button>
          </Can>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {indicator ? (
            <>
              <span className="mono">{indicator.source}</span>
              <span className="mx-2 text-muted-foreground/40">·</span>
              <RelativeTime value={indicator.fetchedAt} />
            </>
          ) : (
            t("neverSet")
          )}
        </p>
      </SectionCard>
    );
  }
}
