"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@tge/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Input } from "@tge/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { Button } from "@tge/ui";
import { Label } from "@tge/ui";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";
import { LocationPicker } from "./location-picker";
import type { LocationSelection } from "./location-picker";
import type { County } from "@tge/types";
import {
  CITY_SLUGS,
  CITY_LABELS,
  PROPERTY_TYPES,
  locationSelectionsFromSearchParams,
} from "./property-filter-constants";
import { FilterPanelSearch } from "./filter/filter-panel-search";
import { applyLocationToParams } from "./filter/filter-location-params";

// Re-exported under the old names so downstream callers keep working without
// a migration. New code should import from ./property-filter-constants.
export const cities = CITY_SLUGS;
export const cityLabels = CITY_LABELS;
export const propertyTypes = PROPERTY_TYPES;

const selectClasses =
  "w-full h-11 rounded-lg border-border text-foreground hover:border-primary/50 transition-colors";
const labelClasses =
  "text-[11px] text-muted-foreground uppercase tracking-[0.18em] font-medium";

interface PropertyFilterPanelProps {
  counties?: County[];
}

export function PropertyFilterPanel({
  counties = [],
}: PropertyFilterPanelProps) {
  const t = useTranslations("PropertiesPage.filter");
  const tTypes = useTranslations("Common.propertyTypes");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);
  const [locationSelections, setLocationSelections] = useState<
    LocationSelection[]
  >(() => locationSelectionsFromSearchParams(searchParams));

  // Resync when the URL changes from under us (back/forward nav) without an
  // effect — React's "adjusting state on prop change" pattern.
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  const cityValue = searchParams.get("city") || "all";
  const typeValue = searchParams.get("type") || "all";
  const sortValue = searchParams.get("sort") || "newest";
  const minPriceValue = searchParams.get("minPrice") || "";
  const maxPriceValue = searchParams.get("maxPrice") || "";
  const bedroomsValue = searchParams.get("minBedrooms") || "all";
  const bathroomsValue = searchParams.get("minBathrooms") || "all";
  const minAreaValue = searchParams.get("minArea") || "";
  const maxAreaValue = searchParams.get("maxArea") || "";

  const activeFilterCount = [
    searchParams.get("search"),
    cityValue !== "all" ? cityValue : null,
    typeValue !== "all" ? typeValue : null,
    minPriceValue || maxPriceValue ? "price" : null,
    bedroomsValue !== "all" ? bedroomsValue : null,
    bathroomsValue !== "all" ? bathroomsValue : null,
    minAreaValue || maxAreaValue ? "area" : null,
  ].filter(Boolean).length;

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      if ("city" in updates) params.delete("from");
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`);
    },
    [searchParams, router, pathname],
  );

  const clearAllFilters = useCallback(() => {
    router.replace(pathname);
    setSearch("");
  }, [router, pathname]);

  const handleSearch = () => {
    updateFilters({ search });
  };

  const applyAllFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    applyLocationToParams(params, locationSelections);
    if (search) params.set("search", search);
    else params.delete("search");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`);
  }, [searchParams, locationSelections, search, router, pathname]);

  const applyWithMapView = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("city");
    params.delete("county");
    params.set("view", "map");
    if (locationSelections.length > 0) {
      const sel = locationSelections[0];
      if (sel.param && sel.slug) params.set(sel.param, sel.slug);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, locationSelections, router, pathname]);

  return (
    <div className="space-y-6">
      {/* Panel heading */}
      <div className="flex items-center gap-2.5">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-primary font-medium">
          {t("filterBy")}
        </span>
      </div>

      <FilterPanelSearch
        value={search}
        onChange={setSearch}
        onSubmit={handleSearch}
        labelText={t("search")}
        placeholder={t("search")}
        labelClassName={labelClasses}
      />

      <div className="border-b border-border" />

      {/* Location */}
      <div className="space-y-2.5">
        <Label className={labelClasses}>{t("location")}</Label>
        <LocationPicker
          counties={counties}
          variant="sidebar"
          value={locationSelections}
          onChange={setLocationSelections}
          onSearchOnMap={applyWithMapView}
        />
      </div>

      {/* Property Type */}
      <div className="space-y-2.5">
        <Label className={labelClasses}>{t("type")}</Label>
        <Select
          value={typeValue}
          onValueChange={(v) => updateFilters({ type: v })}
        >
          <SelectTrigger className={selectClasses}>
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            {propertyTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {tTypes(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-b border-border" />

      {/* Price Range */}
      <div className="space-y-2.5">
        <Label className={labelClasses}>{t("priceRange")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("priceFrom")}
            value={minPriceValue}
            onChange={(e) => updateFilters({ minPrice: e.target.value })}
            className="h-11 rounded-lg border-border text-sm"
          />
          <Input
            type="number"
            placeholder={t("priceTo")}
            value={maxPriceValue}
            onChange={(e) => updateFilters({ maxPrice: e.target.value })}
            className="h-11 rounded-lg border-border text-sm"
          />
        </div>
      </div>

      {/* Area Range */}
      <div className="space-y-2.5">
        <Label className={labelClasses}>{t("areaRange")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("areaFrom")}
            value={minAreaValue}
            onChange={(e) => updateFilters({ minArea: e.target.value })}
            className="h-11 rounded-lg border-border text-sm"
          />
          <Input
            type="number"
            placeholder={t("areaTo")}
            value={maxAreaValue}
            onChange={(e) => updateFilters({ maxArea: e.target.value })}
            className="h-11 rounded-lg border-border text-sm"
          />
        </div>
      </div>

      <div className="border-b border-border" />

      {/* Bedrooms */}
      <div className="space-y-2.5">
        <Label className={labelClasses}>{t("bedrooms")}</Label>
        <Select
          value={bedroomsValue}
          onValueChange={(v) => updateFilters({ minBedrooms: v })}
        >
          <SelectTrigger className={selectClasses}>
            <SelectValue placeholder={t("anyBedrooms")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyBedrooms")}</SelectItem>
            <SelectItem value="1">1+</SelectItem>
            <SelectItem value="2">2+</SelectItem>
            <SelectItem value="3">3+</SelectItem>
            <SelectItem value="4">4+</SelectItem>
            <SelectItem value="5">5+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bathrooms */}
      <div className="space-y-2.5">
        <Label className={labelClasses}>{t("bathrooms")}</Label>
        <Select
          value={bathroomsValue}
          onValueChange={(v) => updateFilters({ minBathrooms: v })}
        >
          <SelectTrigger className={selectClasses}>
            <SelectValue placeholder={t("anyBathrooms")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyBathrooms")}</SelectItem>
            <SelectItem value="1">1+</SelectItem>
            <SelectItem value="2">2+</SelectItem>
            <SelectItem value="3">3+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border-b border-border" />

      {/* Sort */}
      <div className="space-y-2.5">
        <Label className={labelClasses}>{t("sort")}</Label>
        <Select
          value={sortValue}
          onValueChange={(v) => updateFilters({ sort: v })}
        >
          <SelectTrigger className={selectClasses}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("newest")}</SelectItem>
            <SelectItem value="price_asc">{t("priceLowHigh")}</SelectItem>
            <SelectItem value="price_desc">{t("priceHighLow")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={applyAllFilters}
        className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
      >
        <Search className="h-4 w-4 mr-2" />
        {t("searchButton")}
      </Button>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearAllFilters();
            setLocationSelections([]);
          }}
          className="w-full h-10 text-muted-foreground hover:text-primary hover:bg-primary/10 text-[11px] uppercase tracking-[0.15em]"
        >
          <X className="h-3 w-3 mr-1" />
          {t("clearAll")} ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
