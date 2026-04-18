"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  Input,
  Label,
  Slider,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tge/ui";
import { Info } from "lucide-react";
import {
  calculatePurchaseCosts,
  formatEur,
  formatPercent,
} from "@/lib/calculator-utils";

interface CostLineProps {
  label: string;
  value: number;
  info: string;
  total: number;
}

function CostLine({ label, value, info, total }: CostLineProps) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{label}</span>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {info}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {formatPercent(pct)}
        </span>
        <span className="text-sm font-medium w-24 text-right">
          {formatEur(value)}
        </span>
      </div>
    </div>
  );
}

interface PurchaseCostCalculatorProps {
  eurToRon?: number;
}

export function PurchaseCostCalculator({ eurToRon }: PurchaseCostCalculatorProps) {
  const t = useTranslations("ToolsPage.purchaseCost");
  const tCommon = useTranslations("ToolsPage");

  const [propertyPrice, setPropertyPrice] = useState(120000);
  const [agentCommissionPct, setAgentCommissionPct] = useState(2);

  const result = useMemo(
    () => calculatePurchaseCosts(propertyPrice, agentCommissionPct, eurToRon),
    [propertyPrice, agentCommissionPct, eurToRon],
  );

  const costItems = [
    {
      label: t("notaryFee"),
      value: result.notaryFee,
      info: t("notaryFeeInfo"),
    },
    {
      label: t("landRegistryFee"),
      value: result.landRegistryFee,
      info: t("landRegistryInfo"),
    },
    {
      label: t("agentCommissionLabel"),
      value: result.agentCommission,
      info: t("agentCommissionInfo"),
    },
    {
      label: t("stampDuty"),
      value: result.stampDuty,
      info: t("stampDutyInfo"),
    },
    {
      label: t("legalFees"),
      value: result.legalFees,
      info: t("legalFeesInfo"),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <Card className="p-5 md:p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">{t("propertyPrice")}</Label>
            <div className="relative">
              <Input
                id="purchasePrice"
                type="number"
                min={10000}
                max={999999}
                value={propertyPrice}
                onChange={(e) =>
                  setPropertyPrice(Number(e.target.value) || 10000)
                }
                className="pl-8 h-11"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("agentCommission")}</Label>
              <span className="text-sm font-medium text-primary">
                {formatPercent(agentCommissionPct)}
              </span>
            </div>
            <Slider
              value={[agentCommissionPct * 10]}
              onValueChange={([v]) => {
                setAgentCommissionPct(v / 10);
              }}
              min={0}
              max={50}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>5%</span>
            </div>
          </div>

          {/* Visual: fees as % of property */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("propertyPrice")}</span>
              <span>{t("totalFees")}</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden bg-muted flex">
              <div
                className="h-full bg-primary/20 transition-all"
                style={{
                  width: `${(propertyPrice / result.grandTotal) * 100}%`,
                }}
              />
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${(result.totalFees / result.grandTotal) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t("feesPercent", {
                percent: formatPercent(result.feesAsPercent),
              })}
            </p>
          </div>
        </Card>

        {/* Cost Breakdown */}
        <Card className="p-5 md:p-6">
          <h3 className="text-lg font-semibold mb-4">{t("costBreakdown")}</h3>
          <div className="divide-y divide-border">
            {costItems.map((item) => (
              <CostLine
                key={item.label}
                label={item.label}
                value={item.value}
                info={item.info}
                total={propertyPrice}
              />
            ))}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-foreground">
              {t("totalFees")}
            </span>
            <span className="text-lg font-bold text-primary">
              {formatEur(result.totalFees)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 mt-2 rounded-lg bg-primary/5 px-4">
            <span className="text-sm font-semibold text-foreground">
              {t("grandTotal")}
            </span>
            <span className="text-xl font-bold text-primary">
              {formatEur(result.grandTotal)}
            </span>
          </div>
        </Card>
      </div>

      {/* Disclaimers */}
      <div className="text-xs text-muted-foreground text-center max-w-2xl mx-auto space-y-1">
        <p>{tCommon("eurRonDisclaimer")}</p>
        <p>{tCommon("disclaimer")}</p>
      </div>
    </div>
  );
}
