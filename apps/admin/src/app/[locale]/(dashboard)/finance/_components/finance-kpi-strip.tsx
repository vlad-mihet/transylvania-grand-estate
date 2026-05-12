"use client";

import type { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@tge/ui";
import { Landmark, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { Can } from "@/components/shared/can";
import type { FinanceOverview } from "@/lib/finance/use-finance-overview";

type LinkHref = ComponentProps<typeof Link>["href"];

interface IndicatorTileProps {
  label: string;
  icon: LucideIcon;
  href: LinkHref;
  /** Pre-formatted display value (e.g. "12", "4.97", "5.85"). */
  display: string;
  /** Subline rendered below the value — typically a relative time
   * ("synced 2h ago") or a freshness hint. */
  subLine?: ReactNode;
  isLoading: boolean;
}

function IndicatorTile({
  label,
  icon: Icon,
  href,
  display,
  subLine,
  isLoading,
}: IndicatorTileProps) {
  return (
    <Link href={href}>
      <Card className="card-hover h-full rounded-md border-border shadow-none transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5">
          <CardTitle className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground/70" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-7 w-20 animate-pulse rounded-sm bg-muted" />
          ) : (
            <Mono className="block text-2xl font-semibold tabular-nums text-foreground">
              {display}
            </Mono>
          )}
          {subLine && !isLoading ? (
            <div className="mt-1 text-[11px] text-muted-foreground">
              {subLine}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

interface Props {
  data: FinanceOverview;
}

/**
 * Three KPI tiles: active bank-rate count (with oldest-update subline),
 * EUR / RON value (synced from BNR), IRCC current value. Per the locked
 * plan, freshness folds into the count tile's subline rather than its
 * own callout — the relative-time string ("4 months ago") is the
 * staleness signal; no extra coloring needed.
 */
export function FinanceKpiStrip({ data }: Props) {
  const t = useTranslations("Finance.home.kpi");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Can action="bank-rate.read">
        <IndicatorTile
          label={t("bankRates")}
          icon={Landmark}
          href="/bank-rates"
          display={String(data.activeBankRatesCount)}
          isLoading={data.isLoading}
          subLine={
            data.oldestActiveBankRateAt ? (
              <span>
                {t("freshnessLabel")}{" "}
                <RelativeTime
                  value={data.oldestActiveBankRateAt}
                  className="text-muted-foreground"
                />
              </span>
            ) : (
              t("freshnessNone")
            )
          }
        />
      </Can>

      <Can action="financial-indicator.read">
        <IndicatorTile
          label={t("eurRon")}
          icon={TrendingUp}
          href="/financial-indicators"
          display={
            data.eurRon
              ? data.eurRon.value.toFixed(4)
              : t("indicatorMissing")
          }
          isLoading={data.isLoading}
          subLine={
            data.eurRon ? (
              <span>
                {t("syncedLabel")}{" "}
                <RelativeTime value={data.eurRon.fetchedAt} />
              </span>
            ) : null
          }
        />
      </Can>

      <Can action="financial-indicator.read">
        <IndicatorTile
          label={t("ircc")}
          icon={TrendingUp}
          href="/financial-indicators"
          display={
            data.ircc ? data.ircc.value.toFixed(2) : t("indicatorMissing")
          }
          isLoading={data.isLoading}
          subLine={
            data.ircc ? (
              <span>
                {t("updatedLabel")}{" "}
                <RelativeTime value={data.ircc.fetchedAt} />
              </span>
            ) : null
          }
        />
      </Can>
    </div>
  );
}
