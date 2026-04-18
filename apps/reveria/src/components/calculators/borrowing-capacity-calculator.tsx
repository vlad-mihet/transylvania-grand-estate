"use client";

import { useTranslations } from "next-intl";
import type { BankRate } from "@/lib/calculator-utils";
import type { ApiBankRate } from "@/lib/financial-data";
import { useBorrowingCapacity } from "./borrowing-capacity/use-borrowing-capacity";
import { BorrowingCapacityForm } from "./borrowing-capacity/borrowing-capacity-form";
import { DtiVisualization } from "./borrowing-capacity/dti-visualization";
import { BorrowingCapacityResults } from "./borrowing-capacity/borrowing-capacity-results";

interface BorrowingCapacityCalculatorProps {
  bankRates?: BankRate[];
  bankRatesFull?: ApiBankRate[];
  lastUpdated?: string | null;
}

export function BorrowingCapacityCalculator(
  props: BorrowingCapacityCalculatorProps,
) {
  const tCommon = useTranslations("ToolsPage");
  const state = useBorrowingCapacity(props);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">
        <div className="md:col-span-3 space-y-6">
          <BorrowingCapacityForm state={state} />
          <DtiVisualization state={state} />
        </div>
        <div className="md:col-span-2">
          <BorrowingCapacityResults state={state} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
        {tCommon("disclaimer")}
      </p>
    </div>
  );
}
