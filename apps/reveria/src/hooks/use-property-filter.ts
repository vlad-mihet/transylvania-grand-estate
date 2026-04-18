"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Property } from "@tge/types";
import { CITY_LABELS as cityLabels } from "@/components/property/property-filter-constants";

export type SortOption = "price_asc" | "price_desc" | "newest" | "oldest";

export interface FilterParams {
  search?: string;
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  // Exact-match multi-select (e.g. a user who picked 2 and 4 rooms). The
  // API-side `minBedrooms` runs in parallel to cover the open-ended "6+"
  // bucket; when both are present the two clauses are OR'd.
  bedrooms?: number[];
  minBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  sort?: SortOption;
}

export interface ActiveFilter {
  key: string;
  label: string;
}

/**
 * Pure property filter. Exposed separately so it can be unit-tested without
 * mounting a component or a URL-search-params stub.
 */
export function filterProperties(
  properties: Property[],
  params: FilterParams,
): Property[] {
  let result = properties;

  if (params.search) {
    const s = params.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.en.toLowerCase().includes(s) ||
        p.title.ro.toLowerCase().includes(s) ||
        p.location.city.toLowerCase().includes(s),
    );
  }

  if (params.city && params.city !== "all") {
    result = result.filter((p) => p.location.citySlug === params.city);
  }

  if (params.type && params.type !== "all") {
    result = result.filter((p) => p.type === params.type);
  }

  if (params.minPrice != null) {
    result = result.filter((p) => p.price >= params.minPrice!);
  }
  if (params.maxPrice != null) {
    result = result.filter((p) => p.price <= params.maxPrice!);
  }

  const exactBedrooms = params.bedrooms;
  const minBedrooms = params.minBedrooms;
  const hasExactBeds = exactBedrooms && exactBedrooms.length > 0;
  const hasMinBeds = minBedrooms != null;
  if (hasExactBeds && hasMinBeds) {
    const set = new Set(exactBedrooms);
    result = result.filter(
      (p) => set.has(p.specs.bedrooms) || p.specs.bedrooms >= minBedrooms!,
    );
  } else if (hasExactBeds) {
    const set = new Set(exactBedrooms);
    result = result.filter((p) => set.has(p.specs.bedrooms));
  } else if (hasMinBeds) {
    result = result.filter((p) => p.specs.bedrooms >= minBedrooms!);
  }

  if (params.minBathrooms != null) {
    result = result.filter((p) => p.specs.bathrooms >= params.minBathrooms!);
  }

  if (params.minArea != null) {
    result = result.filter((p) => p.specs.area >= params.minArea!);
  }
  if (params.maxArea != null) {
    result = result.filter((p) => p.specs.area <= params.maxArea!);
  }

  // Only sort when we're about to mutate, to preserve the input ordering
  // when no sort is requested.
  if (params.sort) {
    const sorted = [...result];
    switch (params.sort) {
      case "price_asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "oldest":
        sorted.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      case "newest":
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
    return sorted;
  }

  return result === properties ? [...result] : result;
}

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function paramsFromSearch(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
): FilterParams {
  const bedrooms = searchParams
    .getAll("bedrooms")
    .map(Number)
    .filter(Number.isFinite);
  return {
    search: searchParams.get("search") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    minPrice: parseNumber(searchParams.get("minPrice")),
    maxPrice: parseNumber(searchParams.get("maxPrice")),
    bedrooms: bedrooms.length > 0 ? bedrooms : undefined,
    minBedrooms: parseNumber(searchParams.get("minBedrooms")),
    minBathrooms: parseNumber(searchParams.get("minBathrooms")),
    minArea: parseNumber(searchParams.get("minArea")),
    maxArea: parseNumber(searchParams.get("maxArea")),
    sort: (searchParams.get("sort") ?? "newest") as SortOption,
  };
}

/**
 * Reads filter state from URL, returns filtered properties + URL-mutating
 * helpers (updateParam, removeFilter, switchToList) + the sort value +
 * active-filter chip list.
 */
export function usePropertyFilter(properties: Property[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tTypes = useTranslations("Common.propertyTypes");

  const filtered = useMemo(() => {
    return filterProperties(properties, paramsFromSearch(searchParams));
  }, [properties, searchParams]);

  const sortValue = (searchParams.get("sort") ?? "newest") as SortOption;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key === "city") params.delete("from");
      router.replace({
        pathname: "/properties",
        query: Object.fromEntries(params),
      });
    },
    [searchParams, router],
  );

  const removeFilter = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "price") {
        params.delete("minPrice");
        params.delete("maxPrice");
      } else if (key === "area") {
        params.delete("minArea");
        params.delete("maxArea");
      } else if (key === "bedrooms") {
        params.delete("bedrooms");
        params.delete("minBedrooms");
      } else {
        params.delete(key);
      }
      if (key === "city") params.delete("from");
      router.replace({
        pathname: "/properties",
        query: Object.fromEntries(params),
      });
    },
    [searchParams, router],
  );

  const switchToList = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    router.replace({
      pathname: "/properties",
      query: Object.fromEntries(params),
    });
  }, [searchParams, router]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];

    const search = searchParams.get("search");
    if (search) chips.push({ key: "search", label: `"${search}"` });

    const city = searchParams.get("city") ?? "all";
    if (city !== "all") {
      chips.push({ key: "city", label: cityLabels[city] || city });
    }

    const type = searchParams.get("type") ?? "all";
    if (type !== "all") chips.push({ key: "type", label: tTypes(type) });

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice || maxPrice) {
      const from = minPrice ? `€${Number(minPrice).toLocaleString()}` : "";
      const to = maxPrice ? `€${Number(maxPrice).toLocaleString()}` : "";
      chips.push({
        key: "price",
        label:
          from && to ? `${from} – ${to}` : from ? `≥ ${from}` : `≤ ${to}`,
      });
    }

    const exactBeds = searchParams.getAll("bedrooms");
    const minBeds = searchParams.get("minBedrooms");
    if (exactBeds.length > 0 || minBeds) {
      const parts = [...exactBeds, ...(minBeds === "6" ? ["6+"] : [])];
      const label =
        parts.length > 0
          ? `${parts.join(", ")} bed`
          : `${minBeds}+ bed`;
      chips.push({ key: "bedrooms", label });
    }

    const bathrooms = searchParams.get("minBathrooms");
    if (bathrooms) {
      chips.push({ key: "minBathrooms", label: `${bathrooms}+ bath` });
    }

    const minArea = searchParams.get("minArea");
    const maxArea = searchParams.get("maxArea");
    if (minArea || maxArea) {
      const from = minArea ? `${minArea}m²` : "";
      const to = maxArea ? `${maxArea}m²` : "";
      chips.push({
        key: "area",
        label:
          from && to ? `${from} – ${to}` : from ? `≥ ${from}` : `≤ ${to}`,
      });
    }

    return chips;
  }, [searchParams, tTypes]);

  return {
    filtered,
    sortValue,
    activeFilters,
    updateParam,
    removeFilter,
    switchToList,
  };
}
