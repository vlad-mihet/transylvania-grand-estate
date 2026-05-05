"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Label } from "@tge/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { Container } from "@/components/layout/container";
import { LocationPicker } from "@/components/property/location-picker";
import type { LocationSelection } from "@/components/property/location-picker";
import { Search } from "lucide-react";
import type { County } from "@tge/types";

const propertyTypes = [
  "apartment", "house", "villa", "terrain", "penthouse",
] as const;

const radiusOptions = [
  { value: "0", label: "+ 0 km" },
  { value: "5", label: "+ 5 km" },
  { value: "10", label: "+ 10 km" },
  { value: "15", label: "+ 15 km" },
  { value: "25", label: "+ 25 km" },
  { value: "50", label: "+ 50 km" },
  { value: "75", label: "+ 75 km" },
];

interface HeroSectionProps {
  counties?: County[];
}

export function HeroSection({ counties = [] }: HeroSectionProps) {
  const t = useTranslations("HomePage.hero");
  const tTypes = useTranslations("Common.propertyTypes");
  const router = useRouter();

  const [tab, setTab] = useState<"buy" | "rent">("buy");
  const [type, setType] = useState("all");
  const [transaction, setTransaction] = useState("sale");
  const [radius, setRadius] = useState("0");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [locationSelections, setLocationSelections] = useState<LocationSelection[]>([]);

  const handleTabChange = (newTab: "buy" | "rent") => {
    setTab(newTab);
    setTransaction(newTab === "buy" ? "sale" : "rent");
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("price", maxPrice);
    if (minArea) params.set("minArea", minArea);
    if (maxArea) params.set("maxArea", maxArea);

    // Apply location selections
    if (locationSelections.length > 0) {
      const sel = locationSelections[0]; // Primary selection for URL params
      if (sel.type === "address" && sel.lat && sel.lng) {
        params.set("lat", sel.lat.toString());
        params.set("lng", sel.lng.toString());
        params.set("radius", radius !== "0" ? radius : "10");
        params.set("zoom", "14");
        params.set("view", "map");
      } else if (sel.param && sel.slug) {
        params.set(sel.param, sel.slug);
      }
    }

    router.push({
      pathname: "/properties",
      query: Object.fromEntries(params),
    });
  };

  const handleSearchOnMap = () => {
    const params = new URLSearchParams();
    params.set("view", "map");
    // Carry over location if selected
    if (locationSelections.length > 0) {
      const sel = locationSelections[0];
      if (sel.param && sel.slug) {
        params.set(sel.param, sel.slug);
      }
    }
    router.push({
      pathname: "/properties",
      query: Object.fromEntries(params),
    });
  };

  return (
    <section className="relative min-h-[540px] md:min-h-[580px] flex items-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65" />

      <Container className="relative z-10">
        <div className="py-12 sm:py-16 md:py-20 lg:py-24">
          <div className="max-w-3xl mx-auto text-center mb-8 md:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 [text-shadow:_0_2px_12px_rgba(0,0,0,0.3)]">
              {t("title")}
            </h1>
            <p className="text-white/85 text-base sm:text-lg md:text-xl leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          <div>
            {/* Transaction tabs */}
            <div
              role="tablist"
              aria-label={t("searchForm.modeSr")}
              className="flex gap-0 mb-0"
            >
              <button
                type="button"
                role="tab"
                id="hero-tab-buy"
                aria-selected={tab === "buy"}
                aria-controls="hero-search-panel"
                onClick={() => handleTabChange("buy")}
                className={`px-6 py-2.5 text-sm font-semibold rounded-t-xl transition-colors cursor-pointer ${
                  tab === "buy"
                    ? "bg-white text-foreground"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {t("searchForm.tabBuy")}
              </button>
              <button
                type="button"
                role="tab"
                id="hero-tab-rent"
                aria-selected={tab === "rent"}
                aria-controls="hero-search-panel"
                onClick={() => handleTabChange("rent")}
                className={`px-6 py-2.5 text-sm font-semibold rounded-t-xl transition-colors cursor-pointer ${
                  tab === "rent"
                    ? "bg-white text-foreground"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {t("searchForm.tabRent")}
              </button>
            </div>

            {/* Search form */}
            <div
              id="hero-search-panel"
              role="tabpanel"
              aria-labelledby={tab === "buy" ? "hero-tab-buy" : "hero-tab-rent"}
              className="bg-white rounded-b-2xl rounded-tr-2xl shadow-2xl p-4 md:p-5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-2.5 gap-y-3">

                {/* Row 1 */}
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger aria-label={t("searchForm.typeSr")} className="!h-11 border-gray-200 text-sm">
                    <SelectValue placeholder={t("searchForm.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("searchForm.allTypes")}</SelectItem>
                    {propertyTypes.map((pt) => (
                      <SelectItem key={pt} value={pt}>
                        {tTypes(pt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={transaction} onValueChange={(v) => {
                  setTransaction(v);
                  setTab(v === "sale" ? "buy" : "rent");
                }}>
                  <SelectTrigger aria-label={t("searchForm.transactionSr")} className="!h-11 border-gray-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">{t("searchForm.forSale")}</SelectItem>
                    <SelectItem value="rent">{t("searchForm.forRent")}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Address — controlled LocationPicker */}
                <div className="col-span-2">
                  <LocationPicker
                    counties={counties}
                    variant="hero"
                    value={locationSelections}
                    onChange={setLocationSelections}
                    onSearchOnMap={handleSearchOnMap}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Select value={radius} onValueChange={setRadius}>
                    <SelectTrigger aria-label={t("searchForm.radiusSr")} className="!h-11 border-gray-200 text-sm w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {radiusOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 2 */}
                <div>
                  <Label
                    htmlFor="hero-min-price"
                    className="block text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 pl-0.5"
                  >
                    {t("searchForm.priceLabel")}
                  </Label>
                  <Input
                    id="hero-min-price"
                    type="number"
                    placeholder={`${t("searchForm.from")}  €`}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="h-11 border-gray-200 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="hero-max-price" className="sr-only">
                    {t("searchForm.maxPriceSr")}
                  </Label>
                  <span aria-hidden="true" className="block text-[11px] invisible mb-1.5">&nbsp;</span>
                  <Input
                    id="hero-max-price"
                    type="number"
                    placeholder={`${t("searchForm.to")}  €`}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="h-11 border-gray-200 text-sm"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="hero-min-area"
                    className="block text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 pl-0.5"
                  >
                    {t("searchForm.areaLabel")}
                  </Label>
                  <Input
                    id="hero-min-area"
                    type="number"
                    placeholder={`${t("searchForm.from")}  m²`}
                    value={minArea}
                    onChange={(e) => setMinArea(e.target.value)}
                    className="h-11 border-gray-200 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="hero-max-area" className="sr-only">
                    {t("searchForm.maxAreaSr")}
                  </Label>
                  <span aria-hidden="true" className="block text-[11px] invisible mb-1.5">&nbsp;</span>
                  <Input
                    id="hero-max-area"
                    type="number"
                    placeholder={`${t("searchForm.to")}  m²`}
                    value={maxArea}
                    onChange={(e) => setMaxArea(e.target.value)}
                    className="h-11 border-gray-200 text-sm"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[11px] text-muted-foreground invisible mb-1.5">&nbsp;</p>
                  <Button
                    onClick={handleSearch}
                    className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {t("searchForm.searchButton")}
                  </Button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
