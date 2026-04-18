"use client";

import { useTranslations } from "next-intl";
import type { Property } from "@tge/types";
import { PropertyGrid } from "@/components/property/property-grid";
import { MapListToggle } from "@/components/property/map-list-toggle";
import { CTABanner } from "@/components/sections/cta-banner";
import { Container } from "@/components/layout/container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from "@tge/ui";
import { Link } from "@tge/i18n/navigation";
import { ArrowUpDown } from "lucide-react";
import { ActiveFilterChips } from "./active-filter-chips";
import type { ActiveFilter, SortOption } from "@/hooks/use-property-filter";

interface PropertyListViewProps {
  properties: Property[];
  sortValue: SortOption;
  onSortChange: (value: string) => void;
  activeFilters: ActiveFilter[];
  onRemoveFilter: (key: string) => void;
  cta?: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonHref?: string;
  };
}

export function PropertyListView({
  properties,
  sortValue,
  onSortChange,
  activeFilters,
  onRemoveFilter,
  cta,
}: PropertyListViewProps) {
  const t = useTranslations("PropertiesPage");
  const tFilter = useTranslations("PropertiesPage.filter");

  return (
    <>
      <Container>
        <div className="pb-16 md:pb-20 lg:pb-24">
          <div className="flex items-center justify-between py-4 mb-8 border-b border-border">
            <p className="text-muted-foreground text-sm tracking-wide">
              {t("filter.results", { count: properties.length.toString() })}
            </p>
            <div className="flex items-center gap-3">
              <MapListToggle />
              <div className="hidden sm:flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-primary shrink-0" />
                <Select value={sortValue} onValueChange={onSortChange}>
                  <SelectTrigger className="border-border text-foreground w-[200px] rounded-lg">
                    <SelectValue placeholder={tFilter("sort")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{tFilter("newest")}</SelectItem>
                    <SelectItem value="price_asc">
                      {tFilter("priceLowHigh")}
                    </SelectItem>
                    <SelectItem value="price_desc">
                      {tFilter("priceHighLow")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <ActiveFilterChips filters={activeFilters} onRemove={onRemoveFilter} />

          {properties.length > 0 ? (
            <PropertyGrid
              properties={properties}
              className="lg:grid-cols-2 xl:grid-cols-3"
            />
          ) : (
            <div className="text-center py-20">
              <h3 className="font-bold text-2xl text-foreground mb-2">
                {t("noResults.title")}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t("noResults.description")}
              </p>
              <Button
                asChild
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
              >
                <Link href="/contact">
                  {cta?.buttonText ?? t("noResults.title")}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </Container>

      {properties.length > 0 && cta && (
        <CTABanner
          title={cta.title}
          subtitle={cta.subtitle}
          buttonText={cta.buttonText}
          buttonHref={cta.buttonHref}
        />
      )}
    </>
  );
}
