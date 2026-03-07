"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Developer, City } from "@tge/types";
import { DeveloperCard } from "./developer-card";
import { ScrollReveal, Badge } from "@tge/ui";
import { cn } from "@tge/utils";
import { X } from "lucide-react";

interface DeveloperListingProps {
  developers: Developer[];
  cities: City[];
}

export function DeveloperListing({
  developers,
  cities,
}: DeveloperListingProps) {
  const t = useTranslations("DevelopersPage.filter");
  const tCommon = useTranslations("Common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeCity = searchParams.get("city") || "all";
  const activeCityName = cities.find((c) => c.slug === activeCity)?.name;

  const filtered = useMemo(() => {
    if (activeCity === "all") return developers;
    return developers.filter((d) => d.citySlug === activeCity);
  }, [developers, activeCity]);

  function setCity(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "all") {
      params.delete("city");
    } else {
      params.set("city", slug);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  return (
    <>
      {/* City filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setCity("all")}
          className={cn(
            "px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.18em] font-medium border transition-all duration-300 cursor-pointer",
            activeCity === "all"
              ? "bg-copper/15 text-copper border-copper/25"
              : "bg-white/[0.05] text-cream-muted border-copper/10 hover:border-copper/20 hover:text-cream"
          )}
        >
          {t("allCities")}
        </button>
        {cities.map((city) => (
          <button
            key={city.slug}
            onClick={() => setCity(city.slug)}
            className={cn(
              "px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.18em] font-medium border transition-all duration-300 cursor-pointer",
              activeCity === city.slug
                ? "bg-copper/15 text-copper border-copper/25"
                : "bg-white/[0.05] text-cream-muted border-copper/10 hover:border-copper/20 hover:text-cream"
            )}
          >
            {city.name}
          </button>
        ))}
      </div>

      {/* Active filter chips */}
      {activeCity !== "all" && activeCityName && (
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <span className="text-[11px] text-cream-muted/40 uppercase tracking-[0.18em] mr-2">
            {t("activeFilters")}:
          </span>
          <button onClick={() => setCity("all")} className="group cursor-pointer" type="button">
            <Badge className="bg-copper/[0.08] text-copper/90 border-copper/15 group-hover:bg-copper/[0.15] group-hover:border-copper/25 transition-all duration-300 cursor-pointer px-3.5 py-1.5 text-[11px] tracking-wide">
              <span>{activeCityName}</span>
              <X className="h-3 w-3 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </Badge>
          </button>
        </div>
      )}

      {/* Results count */}
      <p className="text-cream-muted/80 text-sm mb-8">
        {t("results", { count: filtered.length })}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((developer, index) => (
          <ScrollReveal key={developer.id} delay={index * 100}>
            <div className="relative">
              {developer.featured && (
                <Badge className="absolute top-3 right-3 z-10 bg-copper/90 text-cream border-0 text-[10px] uppercase tracking-wider">
                  {tCommon("featured")}
                </Badge>
              )}
              <DeveloperCard developer={developer} />
            </div>
          </ScrollReveal>
        ))}
      </div>
    </>
  );
}
