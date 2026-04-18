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

export const cities = [
  "cluj-napoca",
  "oradea",
  "timisoara",
  "brasov",
  "sibiu",
];

export const cityLabels: Record<string, string> = {
  "cluj-napoca": "Cluj-Napoca",
  oradea: "Oradea",
  timisoara: "Timisoara",
  brasov: "Brasov",
  sibiu: "Sibiu",
};

export const propertyTypes = [
  "apartment",
  "house",
  "villa",
  "terrain",
  "penthouse",
  "estate",
  "chalet",
  "mansion",
  "palace",
];

export const priceRanges = [
  { value: "under-500k", labelKey: "priceUnder500k" as const },
  { value: "500k-1m", labelKey: "price500kTo1m" as const },
  { value: "1-1.5", labelKey: "price1to15" as const },
  { value: "1.5-2", labelKey: "price15to2" as const },
  { value: "2-3", labelKey: "price2to3" as const },
  { value: "3+", labelKey: "price3plus" as const },
];

export function PropertyFilterPanel() {
  const t = useTranslations("PropertiesPage.filter");
  const tTypes = useTranslations("Common.propertyTypes");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);

  // Resync when the URL changes from under us (back/forward nav) without an
  // effect — React's "adjusting state on prop change" pattern.
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  const cityValue = searchParams.get("city") || "all";
  const typeValue = searchParams.get("type") || "all";
  const priceValue = searchParams.get("price") || "all";

  const activeFilterCount = [
    searchParams.get("search"),
    cityValue !== "all" ? cityValue : null,
    typeValue !== "all" ? typeValue : null,
    priceValue !== "all" ? priceValue : null,
  ].filter(Boolean).length;

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key === "city" || key === "developer") {
        params.delete("from");
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`);
    },
    [searchParams, router, pathname]
  );

  const clearAllFilters = useCallback(() => {
    const sortParam = searchParams.get("sort");
    const params = new URLSearchParams();
    if (sortParam && sortParam !== "newest") {
      params.set("sort", sortParam);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`);
    setSearch("");
  }, [searchParams, router, pathname]);

  const handleSearch = () => {
    updateFilters("search", search);
  };

  return (
    <div className="space-y-7">
      {/* Panel heading */}
      <div className="flex items-center gap-2.5">
        <SlidersHorizontal className="h-4 w-4 text-copper/80" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-copper/80 font-medium">
          {t("filterBy")}
        </span>
      </div>

      {/* Search */}
      <div className="space-y-3">
        <Label className="text-[11px] text-cream-muted/50 uppercase tracking-[0.18em] font-medium">
          {t("search")}
        </Label>
        <div className="relative">
          <button
            onClick={handleSearch}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-muted/40 hover:text-copper transition-colors duration-300 cursor-pointer"
            aria-label={t("searchButton")}
            type="button"
          >
            <Search className="h-4 w-4" />
          </button>
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-11 pl-11 rounded-lg border-copper/[0.08] text-cream placeholder:text-cream-muted/30 hover:border-copper/15 focus-visible:border-copper/30 focus-visible:ring-copper/15 focus-visible:ring-[3px]"
          />
        </div>
      </div>

      <div className="divider-fade" />

      {/* City */}
      <div className="space-y-3">
        <Label className="text-[11px] text-cream-muted/50 uppercase tracking-[0.18em] font-medium">
          {t("city")}
        </Label>
        <Select
          value={cityValue}
          onValueChange={(value) => updateFilters("city", value)}
        >
          <SelectTrigger className="w-full h-11 rounded-lg border-copper/[0.08] text-cream hover:border-copper/15 focus-visible:border-copper/30 focus-visible:ring-copper/15 focus-visible:ring-[3px]">
            <SelectValue placeholder={t("allCities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCities")}</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {cityLabels[city]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property Type */}
      <div className="space-y-3">
        <Label className="text-[11px] text-cream-muted/50 uppercase tracking-[0.18em] font-medium">
          {t("type")}
        </Label>
        <Select
          value={typeValue}
          onValueChange={(value) => updateFilters("type", value)}
        >
          <SelectTrigger className="w-full h-11 rounded-lg border-copper/[0.08] text-cream hover:border-copper/15 focus-visible:border-copper/30 focus-visible:ring-copper/15 focus-visible:ring-[3px]">
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

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-[11px] text-cream-muted/50 uppercase tracking-[0.18em] font-medium">
          {t("priceRange")}
        </Label>
        <Select
          value={priceValue}
          onValueChange={(value) => updateFilters("price", value)}
        >
          <SelectTrigger className="w-full h-11 rounded-lg border-copper/[0.08] text-cream hover:border-copper/15 focus-visible:border-copper/30 focus-visible:ring-copper/15 focus-visible:ring-[3px]">
            <SelectValue placeholder={t("allPrices")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allPrices")}</SelectItem>
            {priceRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {t(range.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <>
          <div className="divider-fade" />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="w-full h-10 text-cream-muted/70 hover:text-copper hover:bg-copper/[0.06] text-[11px] uppercase tracking-[0.15em] transition-all duration-300"
          >
            <X className="h-3 w-3 mr-1" />
            {t("clearAll")}
          </Button>
        </>
      )}
    </div>
  );
}
