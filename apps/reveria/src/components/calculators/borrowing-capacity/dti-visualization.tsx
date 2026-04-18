"use client";

import { useTranslations } from "next-intl";
import { Card } from "@tge/ui";
import { formatPercent, MAX_DTI_RATIO } from "@/lib/calculator-utils";
import type { BorrowingCapacityState } from "./use-borrowing-capacity";

interface DtiVisualizationProps {
  state: BorrowingCapacityState;
}

export function DtiVisualization({ state }: DtiVisualizationProps) {
  const t = useTranslations("ToolsPage.borrowingCapacity");
  const { result, debtUsedPct, availablePct } = state.values;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="font-medium text-foreground">{t("dtiRatio")}</span>
        <span className="font-semibold tabular-nums">
          {formatPercent(result.dtiRatio * 100)}{" "}
          <span className="text-muted-foreground font-normal">
            / {formatPercent(MAX_DTI_RATIO * 100)}
          </span>
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-muted flex">
        <div
          className="h-full rounded-l-full bg-gradient-to-r from-red-400 to-red-300 transition-all duration-300"
          style={{ width: `${Math.min(debtUsedPct, 100)}%` }}
        />
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
          style={{
            width: `${Math.min(availablePct, 100 - debtUsedPct)}%`,
            borderRadius:
              debtUsedPct === 0
                ? "9999px 0 0 9999px"
                : availablePct + debtUsedPct >= 99
                  ? "0 9999px 9999px 0"
                  : "0",
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            {t("dtiUsed")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t("dtiAvailable")}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {t("dtiExplainer")}
      </p>
    </Card>
  );
}
