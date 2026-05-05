"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@tge/ui";
import { X } from "lucide-react";
import type { ActiveFilter } from "@/hooks/use-property-filter";

interface ActiveFilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
}

export function ActiveFilterChips({ filters, onRemove }: ActiveFilterChipsProps) {
  const tFilter = useTranslations("PropertiesPage.filter");

  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-8">
      <span className="text-[11px] text-muted-foreground uppercase tracking-[0.18em] mr-2">
        {tFilter("activeFilters")}:
      </span>
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onRemove(filter.key)}
          className="group cursor-pointer"
          type="button"
        >
          <Badge className="bg-primary/10 text-primary border-border group-hover:border-primary transition-all cursor-pointer px-3.5 py-1.5 text-[11px] tracking-wide">
            <span>{filter.label}</span>
            <X className="h-3 w-3 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Badge>
        </button>
      ))}
    </div>
  );
}
