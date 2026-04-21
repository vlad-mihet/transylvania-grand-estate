"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { SectionCard } from "@/components/shared/section-card";

interface AuditHealth {
  bootedAt: string;
  failuresSinceBoot: number;
  lastFailureAt: string | null;
  lastError: string | null;
}

/**
 * Surfaces the in-process audit-write failure counter. Hidden when the
 * counter is zero — a healthy system shouldn't burn dashboard real estate.
 * Visible (and red) the moment the API instance fails to write an audit
 * row, so an operator notices before audit gaps accumulate silently.
 *
 * Counter is per-instance and resets on restart by design (see
 * audit.health.ts). Long-term trending lives in pino + external metrics.
 */
export function AuditHealthCard() {
  const t = useTranslations("AuditLogs");
  const { can } = usePermissions();
  const enabled = can("audit-log.read-health");

  const { data } = useQuery({
    queryKey: ["audit-health"],
    queryFn: () => apiClient<AuditHealth>("/audit-logs/health"),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (!enabled || !data || data.failuresSinceBoot === 0) return null;

  return (
    <SectionCard
      title={t("healthTitle")}
      className="border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20"
    >
      <div className="space-y-2 text-sm">
        <p className="text-rose-900 dark:text-rose-200">
          <span className="font-semibold">{data.failuresSinceBoot}</span>{" "}
          {t("healthFailures")}
        </p>
        {data.lastFailureAt && (
          <p className="text-muted-foreground">
            {t("healthLastFailure")}{" "}
            <RelativeTime value={data.lastFailureAt} />
          </p>
        )}
        {data.lastError && (
          <Mono className="block max-w-full overflow-x-auto rounded-sm bg-background p-2 text-[11px] text-muted-foreground">
            {data.lastError}
          </Mono>
        )}
      </div>
    </SectionCard>
  );
}
