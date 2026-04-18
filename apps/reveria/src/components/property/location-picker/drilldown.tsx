"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type {
  LocationSelection,
  NeighborhoodResult,
} from "../location-picker-types";
import { Checkbox } from "./primitives";

interface DrilldownProps {
  city: { name: string; slug: string };
  neighborhoods: NeighborhoodResult[];
  loading: boolean;
  isCitySelected: (citySlug: string) => boolean;
  isNeighborhoodSelected: (name: string, citySlug: string) => boolean;
  onAddSelection: (item: LocationSelection) => void;
  onBackToMain: () => void;
  onClose: () => void;
}

/**
 * City drilldown: an "entire city" option plus a checklist of neighborhoods.
 * Multi-select is allowed (callers keep multiple neighborhoods from the same
 * city in the selection array), so this view doesn't close itself on each
 * click — the orchestrator decides.
 */
export function LocationPickerDrilldown({
  city,
  neighborhoods,
  loading,
  isCitySelected,
  isNeighborhoodSelected,
  onAddSelection,
  onBackToMain,
  onClose,
}: DrilldownProps) {
  const t = useTranslations("MapView");

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-secondary text-foreground text-sm font-medium rounded-md px-2.5 py-1">
          {city.name}
          <X
            className="h-3 w-3 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onBackToMain}
          />
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-2 pb-3">
        <button
          type="button"
          onClick={() =>
            onAddSelection({
              label: city.name,
              sublabel: "întregul oraș",
              type: "city",
              slug: city.slug,
              param: "city",
            })
          }
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
        >
          <Checkbox checked={isCitySelected(city.slug)} />
          <div>
            <p className="text-[15px] font-semibold text-foreground">
              {city.name}, întregul oraș
            </p>
            <p className="text-xs text-muted-foreground">oraș</p>
          </div>
        </button>

        <div className="border-t border-border mx-2 my-1" />

        {loading && (
          <p className="text-sm text-muted-foreground px-4 py-3">...</p>
        )}
        {neighborhoods.map((nb) => (
          <button
            key={nb.id}
            type="button"
            onClick={() =>
              onAddSelection({
                label: nb.name,
                sublabel: `cartier, ${city.name}`,
                type: "neighborhood",
                slug: city.slug,
                param: "city",
              })
            }
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
          >
            <Checkbox checked={isNeighborhoodSelected(nb.name, city.slug)} />
            <div>
              <p className="text-sm font-medium text-foreground">{nb.name}</p>
              <p className="text-xs text-muted-foreground">cartier</p>
            </div>
          </button>
        ))}
        {!loading && neighborhoods.length === 0 && (
          <p className="text-sm text-muted-foreground px-4 py-3">
            {t("noResultsFound")}
          </p>
        )}
      </div>
    </div>
  );
}
