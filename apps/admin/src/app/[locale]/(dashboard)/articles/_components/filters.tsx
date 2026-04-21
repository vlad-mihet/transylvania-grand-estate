"use client";

import { useTranslations } from "next-intl";
import {
  FilterCheckbox,
  FilterGroup,
  FilterRail,
} from "@/components/shared/filter-rail";
import {
  CATEGORIES,
  STATUSES,
  type ArticleCategory,
  type ArticleStatus,
} from "./types";

interface ArticlesFilterRailProps {
  statusFilter: ArticleStatus | "";
  categoryFilter: ArticleCategory | "";
  onStatusChange: (next: ArticleStatus | "") => void;
  onCategoryChange: (next: ArticleCategory | "") => void;
  activeCount: number;
}

export function ArticlesFilterRail({
  statusFilter,
  categoryFilter,
  onStatusChange,
  onCategoryChange,
  activeCount,
}: ArticlesFilterRailProps) {
  const t = useTranslations("Articles");
  const tc = useTranslations("Common");

  return (
    <FilterRail
      activeCount={activeCount}
      onClear={() => {
        onStatusChange("");
        onCategoryChange("");
      }}
    >
      <FilterGroup title={t("columnStatus")}>
        {STATUSES.map((s) => (
          <FilterCheckbox
            key={s}
            label={tc(`statusLabel.${s}` as Parameters<typeof tc>[0])}
            checked={statusFilter === s}
            onChange={(checked) => onStatusChange(checked ? s : "")}
          />
        ))}
      </FilterGroup>
      <FilterGroup title={t("columnCategory")}>
        {CATEGORIES.map((c) => (
          <FilterCheckbox
            key={c}
            label={c.replace(/-/g, " ")}
            checked={categoryFilter === c}
            onChange={(checked) => onCategoryChange(checked ? c : "")}
          />
        ))}
      </FilterGroup>
    </FilterRail>
  );
}
