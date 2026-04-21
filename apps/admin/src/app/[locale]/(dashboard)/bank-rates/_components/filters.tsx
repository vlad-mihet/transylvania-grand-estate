"use client";

import { useTranslations } from "next-intl";
import {
  FilterCheckbox,
  FilterGroup,
  FilterRail,
} from "@/components/shared/filter-rail";
import { RATE_TYPES, type RateType } from "./types";

interface BankRatesFilterRailProps {
  rateTypeFilter: RateType | "";
  activeFilter: "active" | "inactive" | "";
  onRateTypeChange: (next: RateType | "") => void;
  onActiveChange: (next: "active" | "inactive" | "") => void;
  activeCount: number;
}

export function BankRatesFilterRail({
  rateTypeFilter,
  activeFilter,
  onRateTypeChange,
  onActiveChange,
  activeCount,
}: BankRatesFilterRailProps) {
  const t = useTranslations("BankRates");
  const tf = useTranslations("BankRateForm");
  const tc = useTranslations("Common");

  return (
    <FilterRail
      activeCount={activeCount}
      onClear={() => {
        onRateTypeChange("");
        onActiveChange("");
      }}
    >
      <FilterGroup title={t("columnType")}>
        {RATE_TYPES.map((rt) => (
          <FilterCheckbox
            key={rt}
            label={
              tf.has(`types.${rt}` as Parameters<typeof tf.has>[0])
                ? tf(`types.${rt}` as Parameters<typeof tf>[0])
                : rt.replace(/_/g, " ")
            }
            checked={rateTypeFilter === rt}
            onChange={(checked) => onRateTypeChange(checked ? rt : "")}
          />
        ))}
      </FilterGroup>
      <FilterGroup title={t("columnActive")}>
        <FilterCheckbox
          label={tc("statusLabel.active" as Parameters<typeof tc>[0])}
          checked={activeFilter === "active"}
          onChange={(checked) => onActiveChange(checked ? "active" : "")}
        />
        <FilterCheckbox
          label={tc("statusLabel.inactive" as Parameters<typeof tc>[0])}
          checked={activeFilter === "inactive"}
          onChange={(checked) => onActiveChange(checked ? "inactive" : "")}
        />
      </FilterGroup>
    </FilterRail>
  );
}
