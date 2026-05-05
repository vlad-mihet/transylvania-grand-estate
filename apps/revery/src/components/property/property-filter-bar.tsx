"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { Search, ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { LocationPicker } from "./location-picker";
import type { LocationSelection } from "./location-picker";
import type { County } from "@tge/types";
import {
  PROPERTY_TYPES,
  locationSelectionsFromSearchParams,
} from "./property-filter-constants";
import {
  BOOL_FILTER_KEYS,
  defaultFilters,
  FILTER_STYLES,
  RADIUS_OPTIONS,
  STRING_FILTER_KEYS,
  type FiltersState,
} from "./filter/filter-bar-types";
import { RoomToggles } from "./filter/room-toggles";
import { FilterBarMorePanel } from "./filter/filter-bar-more-panel";
import { fetchPropertiesCount } from "@/lib/properties";

const COUNT_DEBOUNCE_MS = 400;

// Re-exported for back-compat with code that imports cityLabels from here.
export { CITY_LABELS as cityLabels } from "./property-filter-constants";

interface PropertyFilterBarProps {
  counties: County[];
  initialResultCount: number;
}

export function PropertyFilterBar({
  counties,
  initialResultCount,
}: PropertyFilterBarProps) {
  const t = useTranslations("PropertiesPage.filter");
  const tTypes = useTranslations("Common.propertyTypes");
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [moreOpen, setMoreOpen] = useState(false);

  // Location is controlled locally and applied on search click.
  const [locationSelections, setLocationSelections] = useState<
    LocationSelection[]
  >(() => locationSelectionsFromSearchParams(searchParams));

  // All filter values are LOCAL state — only pushed to URL when clicking "Rezultate".
  const [filters, setFilters] = useState<FiltersState>(() => ({
    type: searchParams.get("type") || defaultFilters.type,
    transaction: searchParams.get("transaction") || defaultFilters.transaction,
    radius: searchParams.get("radius") || defaultFilters.radius,
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    minArea: searchParams.get("minArea") || "",
    maxArea: searchParams.get("maxArea") || "",
    // Seed the multi-select from `bedrooms=N` (exact picks) plus `minBedrooms=6`
    // (the open-ended "6+" bucket). Other minBedrooms values — only produced
    // by old clients or hand-edited URLs — are ignored here; the API still
    // honours them, so the count stays accurate even if the UI can't render
    // a matching toggle.
    bedrooms: (() => {
      const chosen = searchParams.getAll("bedrooms");
      if (searchParams.get("minBedrooms") === "6") chosen.push("6+");
      return chosen;
    })(),
    minFloor: searchParams.get("minFloor") || "",
    maxFloor: searchParams.get("maxFloor") || "",
    sellerType: searchParams.get("sellerType") || defaultFilters.sellerType,
    furnishing: searchParams.get("furnishing") || defaultFilters.furnishing,
    minBathrooms: searchParams.get("minBathrooms") || "",
    maxBathrooms: searchParams.get("maxBathrooms") || "",
    minYearBuilt: searchParams.get("minYearBuilt") || "",
    maxYearBuilt: searchParams.get("maxYearBuilt") || "",
    minPricePerSqm: searchParams.get("minPricePerSqm") || "",
    maxPricePerSqm: searchParams.get("maxPricePerSqm") || "",
    material: searchParams.get("material") || defaultFilters.material,
    condition: searchParams.get("condition") || defaultFilters.condition,
    postedWithin: searchParams.get("postedWithin") || "",
    hasBalcony: searchParams.get("hasBalcony") === "true",
    hasTerrace: searchParams.get("hasTerrace") === "true",
    hasParking: searchParams.get("hasParking") === "true",
    hasGarage: searchParams.get("hasGarage") === "true",
    hasSeparateKitchen: searchParams.get("hasSeparateKitchen") === "true",
    hasStorage: searchParams.get("hasStorage") === "true",
    hasElevator: searchParams.get("hasElevator") === "true",
    hasImages: searchParams.get("hasImages") === "true",
  }));

  const updateFilter = useCallback(
    (key: keyof FiltersState, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleFilter = useCallback((key: keyof FiltersState) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();

    // Preserve non-filter params (sort, view, from).
    for (const key of ["sort", "view", "from"]) {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    }

    // String filters — only set non-default values.
    for (const key of STRING_FILTER_KEYS) {
      const val = filters[key];
      const def = defaultFilters[key];
      if (val && val !== def) params.set(key, val);
    }

    // Boolean filters.
    for (const key of BOOL_FILTER_KEYS) {
      if (filters[key]) params.set(key, "true");
    }

    // Bedroom multi-select: exact picks repeat `bedrooms=N`; the "6+" bucket
    // maps onto `minBedrooms=6` so the API can OR the two clauses.
    for (const v of filters.bedrooms) {
      if (v === "6+") params.set("minBedrooms", "6");
      else params.append("bedrooms", v);
    }

    // Location.
    if (locationSelections.length > 0) {
      const sel = locationSelections[0];
      if (sel.type === "address" && sel.lat && sel.lng) {
        params.set("lat", sel.lat.toString());
        params.set("lng", sel.lng.toString());
        params.set("radius", filters.radius !== "0" ? filters.radius : "10");
        params.set("zoom", "14");
        params.set("view", "map");
      } else if (sel.param && sel.slug) {
        params.set(sel.param, sel.slug);
      }
    }

    return params;
  }, [filters, locationSelections, searchParams]);

  const handleSearch = useCallback(() => {
    const params = buildFilterParams();
    startTransition(() => {
      router.replace(
        { pathname: "/properties", query: Object.fromEntries(params) },
        { scroll: false },
      );
    });
  }, [buildFilterParams, router]);

  const clearAll = useCallback(() => {
    setLocationSelections([]);
    setFilters({ ...defaultFilters });
    router.replace("/properties");
  }, [router]);

  const hasAnyFilter = searchParams.toString().length > 0;

  // Live count preview: the button shows how many properties the user's
  // *pending* filter state would match. We hit the API (debounced) on every
  // filter edit so the number reflects everything the server knows about —
  // including fields the inline client-side filter doesn't handle.
  const [resultCount, setResultCount] = useState(initialResultCount);
  const [countLoading, setCountLoading] = useState(false);
  const countReqIdRef = useRef(0);
  const isFirstCountEffect = useRef(true);

  useEffect(() => {
    // Skip the first pass: `initialResultCount` already reflects the URL
    // filters that seeded local state, so refetching on mount would just
    // produce the same number after a spinner flash.
    if (isFirstCountEffect.current) {
      isFirstCountEffect.current = false;
      return;
    }

    const reqId = ++countReqIdRef.current;
    setCountLoading(true);

    const params = new URLSearchParams();
    for (const key of STRING_FILTER_KEYS) {
      const val = filters[key];
      if (val && val !== defaultFilters[key]) params.set(key, val);
    }
    for (const key of BOOL_FILTER_KEYS) {
      if (filters[key]) params.set(key, "true");
    }
    for (const v of filters.bedrooms) {
      if (v === "6+") params.set("minBedrooms", "6");
      else params.append("bedrooms", v);
    }
    if (locationSelections.length > 0) {
      const sel = locationSelections[0];
      if (sel.type === "address" && sel.lat && sel.lng) {
        params.set("lat", sel.lat.toString());
        params.set("lng", sel.lng.toString());
        params.set(
          "radius",
          filters.radius !== "0" ? filters.radius : "10",
        );
      } else if (sel.param && sel.slug) {
        params.set(sel.param, sel.slug);
      }
    }

    const timer = setTimeout(async () => {
      try {
        const total = await fetchPropertiesCount(params);
        if (reqId === countReqIdRef.current) setResultCount(total);
      } catch (err) {
        console.error("Failed to fetch property count", err);
      } finally {
        if (reqId === countReqIdRef.current) setCountLoading(false);
      }
    }, COUNT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filters, locationSelections]);

  return (
    <div className="bg-card border-b border-border">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        {/* Row 1: Type, Transaction, Location, Radius */}
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="w-[calc(50%-5px)] sm:w-[160px]">
            <p className={FILTER_STYLES.label}>{t("type")}</p>
            <Select
              value={filters.type}
              onValueChange={(v) => updateFilter("type", v)}
            >
              <SelectTrigger className={`${FILTER_STYLES.trigger} w-full`}>
                <SelectValue placeholder={t("allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {tTypes(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[calc(50%-5px)] sm:w-[150px]">
            <p className={FILTER_STYLES.label}>{t("transaction")}</p>
            <Select
              value={filters.transaction}
              onValueChange={(v) => updateFilter("transaction", v)}
            >
              <SelectTrigger className={`${FILTER_STYLES.trigger} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">{t("forSale")}</SelectItem>
                <SelectItem value="rent">{t("forRent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <p className={FILTER_STYLES.label}>{t("location")}</p>
            <LocationPicker
              counties={counties}
              variant="hero"
              value={locationSelections}
              onChange={setLocationSelections}
              onSearchOnMap={() => {
                const params = buildFilterParams();
                params.set("view", "map");
                router.replace({
                  pathname: "/properties",
                  query: Object.fromEntries(params),
                });
              }}
            />
          </div>

          <div className="w-full sm:w-[120px]">
            <p className={FILTER_STYLES.label}>{t("radius")}</p>
            <Select
              value={filters.radius}
              onValueChange={(v) => updateFilter("radius", v)}
            >
              <SelectTrigger className={`${FILTER_STYLES.trigger} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Price, Area, Rooms */}
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 mt-4">
          <div className="w-full sm:w-auto">
            <p className={FILTER_STYLES.label}>{t("priceRange")}</p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={t("priceFrom")}
                value={filters.minPrice}
                onChange={(e) => updateFilter("minPrice", e.target.value)}
                className={`${FILTER_STYLES.input} flex-1 sm:flex-none sm:w-[130px]`}
              />
              <Input
                type="number"
                placeholder={t("priceTo")}
                value={filters.maxPrice}
                onChange={(e) => updateFilter("maxPrice", e.target.value)}
                className={`${FILTER_STYLES.input} flex-1 sm:flex-none sm:w-[130px]`}
              />
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <p className={FILTER_STYLES.label}>{t("areaRange")}</p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={t("areaFrom")}
                value={filters.minArea}
                onChange={(e) => updateFilter("minArea", e.target.value)}
                className={`${FILTER_STYLES.input} flex-1 sm:flex-none sm:w-[130px]`}
              />
              <Input
                type="number"
                placeholder={t("areaTo")}
                value={filters.maxArea}
                onChange={(e) => updateFilter("maxArea", e.target.value)}
                className={`${FILTER_STYLES.input} flex-1 sm:flex-none sm:w-[130px]`}
              />
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <p className={FILTER_STYLES.label}>{t("rooms")}</p>
            <RoomToggles
              value={filters.bedrooms}
              onChange={(next) =>
                setFilters((prev) => ({ ...prev, bedrooms: next }))
              }
            />
          </div>
        </div>

        {/* Row 3: Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 mt-4">
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-muted-foreground font-medium hover:text-foreground hover:underline cursor-pointer transition-colors"
            >
              {t("clearFilters")}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex items-center gap-1 text-sm text-muted-foreground font-medium hover:text-foreground hover:underline cursor-pointer transition-colors"
          >
            {moreOpen ? t("lessFilters") : t("moreFilters")}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`}
            />
          </button>

          <Button
            onClick={handleSearch}
            disabled={isPending}
            className="h-11 !px-6 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold rounded-lg shadow-sm disabled:opacity-80"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {t("resultsCount", {
              count: countLoading ? "..." : resultCount.toLocaleString(),
            })}
          </Button>
          <span role="status" aria-live="polite" className="sr-only">
            {countLoading
              ? ""
              : t("resultsCount", { count: resultCount.toLocaleString() })}
          </span>
        </div>

        {moreOpen && (
          <FilterBarMorePanel
            filters={filters}
            updateFilter={updateFilter}
            toggleFilter={toggleFilter}
          />
        )}
      </div>
    </div>
  );
}
