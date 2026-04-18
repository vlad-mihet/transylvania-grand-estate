"use client";

import { useTranslations } from "next-intl";
import type { County } from "@tge/types";
import type {
  CountyWithCities,
  LocationSelection,
} from "../location-picker-types";
import { CountyRow } from "./primitives";

interface ListViewProps {
  counties: County[];
  onAddSelection: (item: LocationSelection) => void;
  onEnterDrilldown: (cityName: string, citySlug: string) => void;
  onBack: () => void;
}

/**
 * Hierarchical browsing view: each county expands lazily into its cities, and
 * choosing a city opens the city drilldown. The "entire county" shortcut
 * yields a county-scoped selection directly.
 */
export function LocationPickerListView({
  counties,
  onAddSelection,
  onEnterDrilldown,
  onBack,
}: ListViewProps) {
  const t = useTranslations("MapView");

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <div className="px-5 pt-3 pb-1">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-primary font-medium hover:underline cursor-pointer"
        >
          ← {t("back")}
        </button>
      </div>
      <div className="px-2 pb-3">
        {counties.map((county) => (
          <CountyRow
            key={county.slug}
            county={county as CountyWithCities}
            onSelectCounty={(slug) =>
              onAddSelection({
                label: county.name,
                sublabel: "județ",
                type: "county",
                slug,
                param: "county",
              })
            }
            onSelectCity={(cityName, citySlug) =>
              onEnterDrilldown(cityName, citySlug)
            }
          />
        ))}
      </div>
    </div>
  );
}
