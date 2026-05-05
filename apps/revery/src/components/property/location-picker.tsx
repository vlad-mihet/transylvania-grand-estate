"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { County } from "@tge/types";
import type {
  CityResult,
  LocationSelection,
  NeighborhoodResult,
} from "./location-picker-types";
import { fetchCityNeighborhoods, useLocationSearch } from "./use-location-search";
import { useLocationRecent } from "./location-picker/use-location-recent";
import { LocationPickerChipRow } from "./location-picker/chip-row";
import { LocationPickerMainMenu } from "./location-picker/main-menu";
import { LocationPickerListView } from "./location-picker/list-view";
import { LocationPickerDrilldown } from "./location-picker/drilldown";
import { LocationPickerSearchResults } from "./location-picker/search-results";

export type { LocationSelection } from "./location-picker-types";

type View = "main" | "list" | "search" | "drilldown";

interface LocationPickerProps {
  counties: County[];
  variant?: "sidebar" | "hero";
  /** Current selections (controlled) */
  value?: LocationSelection[];
  /** Called when selections change */
  onChange?: (selections: LocationSelection[]) => void;
  /** If provided, selecting "Search on map" calls this instead of navigating */
  onSearchOnMap?: () => void;
}

/**
 * Orchestrates the location picker: owns the dropdown open/close state, the
 * current view in the state machine (`main` / `search` / `list` /
 * `drilldown`), and the selection array. Every view is a pure presentational
 * sub-component under `./location-picker/*` — this file decides which one to
 * render and wires in the handlers.
 */
export function LocationPicker({
  counties,
  variant = "sidebar",
  value = [],
  onChange,
  onSearchOnMap,
}: LocationPickerProps) {
  const t = useTranslations("MapView");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("main");
  const [drillCity, setDrillCity] = useState<{
    name: string;
    slug: string;
  } | null>(null);
  const [drillNeighborhoods, setDrillNeighborhoods] = useState<
    NeighborhoodResult[]
  >([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [expandedCitySlug, setExpandedCitySlug] = useState<string | null>(null);

  const { results, setResults, loading } = useLocationSearch(query);
  const { items: recentItems, add: addRecent } = useLocationRecent();

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setView("main");
        setDrillCity(null);
        setExpandedCitySlug(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const addSelection = useCallback(
    (item: LocationSelection) => {
      addRecent(item);

      // County / city / address replace the selection array. Neighborhoods are
      // multi-select within a single city, and clicking one that is already
      // selected toggles it off.
      let next: LocationSelection[];
      if (
        item.type === "county" ||
        item.type === "city" ||
        item.type === "address"
      ) {
        next = [item];
      } else {
        const sameCity = value.filter(
          (v) => v.type === "neighborhood" && v.slug === item.slug,
        );
        if (sameCity.length > 0 || value.length === 0) {
          const exists = value.find(
            (v) => v.label === item.label && v.slug === item.slug,
          );
          if (exists) {
            next = value.filter(
              (v) => !(v.label === item.label && v.slug === item.slug),
            );
          } else {
            next = [...value, item];
          }
        } else {
          next = [item];
        }
      }

      onChange?.(next);

      // Neighborhoods allow further picks, so keep the drilldown open.
      if (item.type !== "neighborhood") {
        setOpen(false);
        setQuery("");
        setView("main");
        setDrillCity(null);
        setExpandedCitySlug(null);
      }
    },
    [value, onChange, addRecent],
  );

  const removeSelection = useCallback(
    (idx: number) => {
      const next = value.filter((_, i) => i !== idx);
      onChange?.(next);
    },
    [value, onChange],
  );

  const clearAll = useCallback(() => {
    onChange?.([]);
  }, [onChange]);

  const enterDrilldown = useCallback(
    async (cityName: string, citySlug: string) => {
      setDrillCity({ name: cityName, slug: citySlug });
      setView("drilldown");
      setQuery("");
      setDrillLoading(true);
      const nbs = await fetchCityNeighborhoods(citySlug);
      setDrillNeighborhoods(nbs);
      setDrillLoading(false);
    },
    [],
  );

  const toggleCityExpand = useCallback(
    async (city: CityResult) => {
      if (expandedCitySlug === city.slug) {
        setExpandedCitySlug(null);
        return;
      }
      setExpandedCitySlug(city.slug);
      if (city.neighborhoods && city.neighborhoods.length > 0) return;
      const nbs = await fetchCityNeighborhoods(city.slug);
      if (results) {
        const updated = { ...results };
        updated.cities = updated.cities.map((c) =>
          c.slug === city.slug ? { ...c, neighborhoods: nbs } : c,
        );
        setResults(updated);
      }
    },
    [expandedCitySlug, results, setResults],
  );

  const handleSearchOnMap = useCallback(() => {
    onSearchOnMap?.();
    setOpen(false);
  }, [onSearchOnMap]);

  const isNeighborhoodSelected = useCallback(
    (name: string, citySlug: string) =>
      value.some(
        (v) =>
          v.type === "neighborhood" && v.label === name && v.slug === citySlug,
      ),
    [value],
  );

  const isCitySelected = useCallback(
    (citySlug: string) =>
      value.some((v) => v.type === "city" && v.slug === citySlug),
    [value],
  );

  return (
    <div ref={containerRef} className="relative">
      <LocationPickerChipRow
        selections={value}
        query={query}
        placeholder={t("typeAddress")}
        open={open}
        variant={variant}
        onQueryChange={(next) => {
          setQuery(next);
          if (!open) setOpen(true);
          if (view === "main" || view === "drilldown") setView("search");
        }}
        onFocus={() => {
          setOpen(true);
          if (!query && view !== "drilldown") setView("main");
        }}
        onClickRow={() => {
          setOpen(true);
          if (!query && !drillCity) setView("main");
        }}
        onRemoveSelection={removeSelection}
        onClearAll={clearAll}
      />

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
          {query.length >= 2 && view === "search" && (
            <LocationPickerSearchResults
              query={query}
              results={results}
              loading={loading}
              expandedCitySlug={expandedCitySlug}
              onAddSelection={addSelection}
              onEnterDrilldown={enterDrilldown}
              onToggleCityExpand={toggleCityExpand}
            />
          )}

          {view === "drilldown" && drillCity && (
            <LocationPickerDrilldown
              city={drillCity}
              neighborhoods={drillNeighborhoods}
              loading={drillLoading}
              isCitySelected={isCitySelected}
              isNeighborhoodSelected={isNeighborhoodSelected}
              onAddSelection={addSelection}
              onBackToMain={() => {
                setDrillCity(null);
                setView("main");
              }}
              onClose={() => {
                setDrillCity(null);
                setView("main");
                setOpen(false);
              }}
            />
          )}

          {query.length < 2 && view === "main" && (
            <LocationPickerMainMenu
              recentItems={recentItems}
              onSelectRecent={addSelection}
              onSearchOnMap={handleSearchOnMap}
              onGoToSearch={() => setView("search")}
              onGoToList={() => setView("list")}
            />
          )}

          {view === "list" && (
            <LocationPickerListView
              counties={counties}
              onAddSelection={addSelection}
              onEnterDrilldown={enterDrilldown}
              onBack={() => setView("main")}
            />
          )}

          {query.length < 2 && view === "search" && (
            <div className="px-5 py-4">
              <button
                type="button"
                onClick={() => setView("main")}
                className="text-xs text-primary font-medium hover:underline cursor-pointer mb-2"
              >
                ← {t("back")}
              </button>
              <p className="text-sm text-muted-foreground">
                {t("typeAtLeast2")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
