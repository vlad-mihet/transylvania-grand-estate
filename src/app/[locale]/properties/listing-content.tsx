"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Property } from "@/types/property";
import { PropertyGrid } from "@/components/property/property-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, X } from "lucide-react";
import {
  cityLabels,
  priceRanges,
} from "@/components/property/property-filter-panel";

interface PropertyListingContentProps {
  properties: Property[];
}

export function PropertyListingContent({
  properties,
}: PropertyListingContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("PropertiesPage");
  const tFilter = useTranslations("PropertiesPage.filter");
  const tTypes = useTranslations("Common.propertyTypes");

  const filtered = useMemo(() => {
    let result = [...properties];

    const search = searchParams.get("search")?.toLowerCase();
    if (search) {
      result = result.filter(
        (p) =>
          p.title.en.toLowerCase().includes(search) ||
          p.title.ro.toLowerCase().includes(search) ||
          p.location.city.toLowerCase().includes(search)
      );
    }

    const city = searchParams.get("city");
    if (city && city !== "all") {
      result = result.filter((p) => p.location.citySlug === city);
    }

    const type = searchParams.get("type");
    if (type && type !== "all") {
      result = result.filter((p) => p.type === type);
    }

    const developer = searchParams.get("developer");
    if (developer) {
      result = result.filter(
        (p) =>
          p.developerId &&
          p.developerName?.toLowerCase().replace(/\s+/g, "-") === developer
      );
    }

    const price = searchParams.get("price");
    if (price && price !== "all") {
      switch (price) {
        case "under-500k":
          result = result.filter((p) => p.price < 500000);
          break;
        case "500k-1m":
          result = result.filter(
            (p) => p.price >= 500000 && p.price < 1000000
          );
          break;
        case "1-1.5":
          result = result.filter(
            (p) => p.price >= 1000000 && p.price < 1500000
          );
          break;
        case "1.5-2":
          result = result.filter(
            (p) => p.price >= 1500000 && p.price < 2000000
          );
          break;
        case "2-3":
          result = result.filter(
            (p) => p.price >= 2000000 && p.price < 3000000
          );
          break;
        case "3+":
          result = result.filter((p) => p.price >= 3000000);
          break;
      }
    }

    const sort = searchParams.get("sort") || "newest";
    switch (sort) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return result;
  }, [properties, searchParams]);

  // Sort + chip URL helpers
  const sortValue = searchParams.get("sort") || "newest";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`);
    },
    [searchParams, router, pathname]
  );

  // Build active filter chips
  const activeFilters: { key: string; label: string }[] = [];
  const searchParam = searchParams.get("search");
  if (searchParam) {
    activeFilters.push({ key: "search", label: `"${searchParam}"` });
  }
  const cityValue = searchParams.get("city") || "all";
  if (cityValue !== "all") {
    activeFilters.push({
      key: "city",
      label: cityLabels[cityValue] || cityValue,
    });
  }
  const typeValue = searchParams.get("type") || "all";
  if (typeValue !== "all") {
    activeFilters.push({ key: "type", label: tTypes(typeValue) });
  }
  const priceValue = searchParams.get("price") || "all";
  if (priceValue !== "all") {
    const priceRange = priceRanges.find((r) => r.value === priceValue);
    activeFilters.push({
      key: "price",
      label: priceRange ? tFilter(priceRange.labelKey) : priceValue,
    });
  }

  const removeFilter = useCallback(
    (key: string) => {
      updateParam(key, "all");
    },
    [updateParam]
  );

  return (
    <div>
      {/* Results toolbar: count (left) + sort (right) */}
      <div className="flex items-center justify-between py-4 mb-8 border-b border-copper/[0.06]">
        <p className="text-cream-muted/80 text-sm tracking-wide">
          {t("filter.results", { count: filtered.length.toString() })}
        </p>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-copper/70 hidden sm:block shrink-0" />
          <Select
            value={sortValue}
            onValueChange={(value) => updateParam("sort", value)}
          >
            <SelectTrigger className="border-copper/[0.08] text-cream w-[200px] rounded-lg hover:border-copper/15 focus-visible:border-copper/30 focus-visible:ring-copper/15 focus-visible:ring-[3px]">
              <SelectValue placeholder={tFilter("sort")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{tFilter("newest")}</SelectItem>
              <SelectItem value="price-asc">
                {tFilter("priceLowHigh")}
              </SelectItem>
              <SelectItem value="price-desc">
                {tFilter("priceHighLow")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 mb-8">
          <span className="text-[11px] text-cream-muted/40 uppercase tracking-[0.18em] mr-2">
            {tFilter("activeFilters")}:
          </span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => removeFilter(filter.key)}
              className="group"
              type="button"
            >
              <Badge className="bg-copper/[0.08] text-copper/90 border-copper/15 group-hover:bg-copper/[0.15] group-hover:border-copper/25 transition-all duration-300 cursor-pointer px-3.5 py-1.5 text-[11px] tracking-wide">
                <span>{filter.label}</span>
                <X className="h-3 w-3 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Property grid — 2 cols at lg (sidebar takes space), 3 cols at xl */}
      {filtered.length > 0 ? (
        <PropertyGrid
          properties={filtered}
          className="lg:grid-cols-2 xl:grid-cols-3"
        />
      ) : (
        <div className="text-center py-20">
          <h3 className="font-serif text-2xl text-cream mb-2">
            {t("noResults.title")}
          </h3>
          <p className="text-cream-muted">{t("noResults.description")}</p>
        </div>
      )}
    </div>
  );
}
