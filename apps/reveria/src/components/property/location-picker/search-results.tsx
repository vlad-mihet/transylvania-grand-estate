"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, MapPin } from "lucide-react";
import type {
  CityResult,
  LocationSearchResult,
  LocationSelection,
} from "../location-picker-types";
import { highlightMatches } from "./highlight";

interface SearchResultsProps {
  query: string;
  results: LocationSearchResult | null;
  loading: boolean;
  expandedCitySlug: string | null;
  onAddSelection: (item: LocationSelection) => void;
  onEnterDrilldown: (cityName: string, citySlug: string) => void;
  onToggleCityExpand: (city: CityResult) => void;
}

/**
 * The search-view list: counties, cities (with inline neighborhood peek),
 * neighborhood matches, and address results from the geocoder. All purely
 * presentational — the orchestrator owns state and handlers.
 */
export function LocationPickerSearchResults({
  query,
  results,
  loading,
  expandedCitySlug,
  onAddSelection,
  onEnterDrilldown,
  onToggleCityExpand,
}: SearchResultsProps) {
  const t = useTranslations("MapView");
  const highlight = (text: string) => highlightMatches(text, query);

  return (
    <div className="max-h-[400px] overflow-y-auto py-2 px-2">
      {loading && (
        <p className="text-sm text-muted-foreground px-4 py-3">
          {t("searching")}...
        </p>
      )}
      {!loading && results && (
        <>
          {results.counties.map((county) => (
            <button
              key={county.id}
              type="button"
              onClick={() =>
                onAddSelection({
                  label: county.name,
                  sublabel: "județ",
                  type: "county",
                  slug: county.slug,
                  param: "county",
                })
              }
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
            >
              <p className="text-[15px] font-semibold text-foreground">
                {highlight(county.name)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">județ</p>
            </button>
          ))}

          {results.cities.map((city) => (
            <div key={city.id}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => onEnterDrilldown(city.name, city.slug)}
                  className="flex-1 text-left px-4 py-2.5 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                >
                  <p className="text-[15px] font-semibold text-foreground">
                    {highlight(city.name)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {city.county
                      ? `capitală, ${city.county.name}`
                      : "oraș"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCityExpand(city);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors mr-2"
                >
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      expandedCitySlug === city.slug ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
              {expandedCitySlug === city.slug && (
                <div className="pl-8 pb-2">
                  {(city.neighborhoods ?? []).slice(0, 4).map((nb) => (
                    <button
                      key={nb.id || nb.slug}
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
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded-lg text-sm text-foreground cursor-pointer transition-colors"
                    >
                      <span className="font-medium">{nb.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        cartier
                      </span>
                    </button>
                  ))}
                  {(city.neighborhoods ?? []).length > 4 && (
                    <button
                      type="button"
                      onClick={() => onEnterDrilldown(city.name, city.slug)}
                      className="text-xs text-primary font-medium px-3 py-1.5 hover:underline cursor-pointer"
                    >
                      Mai mult
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {(results.neighborhoods ?? []).map((nb, i) => {
            const cityName =
              typeof nb.city === "string" ? nb.city : nb.city?.name ?? "";
            const citySlug =
              typeof nb.city === "string"
                ? nb.citySlug ?? ""
                : nb.city?.slug ?? nb.citySlug ?? "";
            const countyName =
              typeof nb.city === "object" && nb.city?.county?.name
                ? nb.city.county.name
                : "";
            return (
              <button
                key={nb.id || `nb-${i}`}
                type="button"
                onClick={() =>
                  onAddSelection({
                    label: nb.name,
                    sublabel: `cartier, ${cityName}`,
                    type: "neighborhood",
                    slug: citySlug,
                    param: "city",
                  })
                }
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
              >
                <p className="text-[15px] font-semibold text-foreground">
                  {highlight(nb.name)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  cartier, {cityName}
                  {countyName ? `, ${countyName}` : ""}
                </p>
              </button>
            );
          })}

          {(results.addresses ?? []).length > 0 && (
            <>
              {(results.counties.length > 0 ||
                results.cities.length > 0 ||
                (results.neighborhoods ?? []).length > 0) && (
                <div className="border-t border-border mx-2 my-1" />
              )}
              {results.addresses.map((addr, i) => (
                <button
                  key={`addr-${i}`}
                  type="button"
                  onClick={() =>
                    onAddSelection({
                      label: addr.name,
                      sublabel: addr.sublabel,
                      type: "address",
                      slug: "",
                      param: "",
                      lat: addr.latitude,
                      lng: addr.longitude,
                    })
                  }
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors flex items-start gap-3"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">
                      {highlight(addr.name)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {addr.sublabel}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}

          {results.counties.length === 0 &&
            results.cities.length === 0 &&
            (results.neighborhoods ?? []).length === 0 &&
            (results.addresses ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground px-4 py-3">
                {t("noResultsFound")}
              </p>
            )}
        </>
      )}
    </div>
  );
}
