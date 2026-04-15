"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import type { Property } from "@tge/types";
import { Container } from "@/components/layout/container";
import { PropertyGrid } from "@/components/property/property-grid";
import { SectionHeading, AccentButton } from "@tge/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tge/ui";
import { cn } from "@tge/utils";

interface CityPropertiesProps {
  properties: Property[];
  cityName: string;
  citySlug: string;
  propertyTypes: string[];
}

const INITIAL_COUNT = 6;

type SortKey = "newest" | "price-asc" | "price-desc";

export function CityProperties({
  properties,
  cityName,
  citySlug,
  propertyTypes,
}: CityPropertiesProps) {
  const t = useTranslations("CityDetail.properties");
  const tTypes = useTranslations("Common.propertyTypes");
  const [activeType, setActiveType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  const filtered = useMemo(() => {
    let result =
      activeType === "all"
        ? properties
        : properties.filter((p) => p.type === activeType);

    switch (sortBy) {
      case "price-asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "newest":
      default:
        result = [...result].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    return result;
  }, [properties, activeType, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading
          title={t("title", { city: cityName })}
          subtitle={t("subtitle")}
        />

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          {/* Type pills */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setActiveType("all");
                setVisibleCount(INITIAL_COUNT);
              }}
              className={cn(
                "px-5 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-medium border transition-all duration-500 ease-out cursor-pointer",
                activeType === "all"
                  ? "bg-copper/[0.12] text-copper border-copper/30 shadow-[0_0_12px_rgba(184,145,100,0.08)]"
                  : "bg-white/[0.03] text-cream-muted/50 border-white/[0.06] hover:border-copper/15 hover:text-cream-muted/80 hover:bg-white/[0.05]"
              )}
            >
              {t("allTypes")}
            </button>
            {propertyTypes.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  setVisibleCount(INITIAL_COUNT);
                }}
                className={cn(
                  "px-5 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-medium border transition-all duration-500 ease-out cursor-pointer",
                  activeType === type
                    ? "bg-copper/[0.12] text-copper border-copper/30 shadow-[0_0_12px_rgba(184,145,100,0.08)]"
                    : "bg-white/[0.03] text-cream-muted/50 border-white/[0.06] hover:border-copper/15 hover:text-cream-muted/80 hover:bg-white/[0.05]"
                )}
              >
                {tTypes(type)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortKey)}
          >
            <SelectTrigger className="w-full sm:w-[200px] bg-white/[0.05] border-copper/10 text-cream text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("sort.newest")}</SelectItem>
              <SelectItem value="price-asc">{t("sort.priceLowHigh")}</SelectItem>
              <SelectItem value="price-desc">{t("sort.priceHighLow")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {visible.length > 0 ? (
          <PropertyGrid properties={visible} />
        ) : (
          <p className="text-cream-muted text-center py-12">
            {t("noResults")}
          </p>
        )}

        {/* Load more / View all */}
        <div className="mt-10 flex items-center justify-center gap-4">
          {hasMore && (
            <AccentButton
              accentVariant="outline"
              onClick={() => setVisibleCount((c) => c + INITIAL_COUNT)}
            >
              {t("loadMore")}
            </AccentButton>
          )}
          <AccentButton accentVariant="solid" asChild>
            <Link href={`/properties?city=${citySlug}&from=city`}>{t("viewAll")}</Link>
          </AccentButton>
        </div>
      </Container>
    </section>
  );
}
