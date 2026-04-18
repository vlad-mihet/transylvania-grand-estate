"use client";

import { useTranslations } from "next-intl";
import { Input } from "@tge/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { AmenityCheckbox } from "./amenity-checkbox";
import type { FiltersState } from "./filter-bar-types";
import { FILTER_STYLES } from "./filter-bar-types";

interface FilterBarMorePanelProps {
  filters: FiltersState;
  updateFilter: (key: keyof FiltersState, value: string) => void;
  toggleFilter: (key: keyof FiltersState) => void;
}

/**
 * The expandable "more filters" section of the top filter bar. Holds advanced
 * controls (floor, seller type, furnishing, bathrooms, year, price/m², material,
 * condition), the posted-within radio, the amenities checkbox group, and the
 * standalone "has images" toggle.
 *
 * Kept stateless — all values and setters are threaded in from the parent so
 * the orchestrator keeps a single source of truth for filter state.
 */
export function FilterBarMorePanel({
  filters,
  updateFilter,
  toggleFilter,
}: FilterBarMorePanelProps) {
  const t = useTranslations("PropertiesPage.filter");

  return (
    <div className="border-t border-border mt-5 pt-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-4">
        <div>
          <p className={FILTER_STYLES.label}>{t("floor")}</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t("floorFrom")}
              value={filters.minFloor}
              onChange={(e) => updateFilter("minFloor", e.target.value)}
              className={`${FILTER_STYLES.input} flex-1`}
            />
            <Input
              type="number"
              placeholder={t("floorTo")}
              value={filters.maxFloor}
              onChange={(e) => updateFilter("maxFloor", e.target.value)}
              className={`${FILTER_STYLES.input} flex-1`}
            />
          </div>
        </div>

        <div>
          <p className={FILTER_STYLES.label}>{t("sellerType")}</p>
          <Select
            value={filters.sellerType}
            onValueChange={(v) => updateFilter("sellerType", v)}
          >
            <SelectTrigger className={FILTER_STYLES.trigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-</SelectItem>
              <SelectItem value="private_seller">{t("sellerPrivate")}</SelectItem>
              <SelectItem value="agency">{t("sellerAgency")}</SelectItem>
              <SelectItem value="developer">{t("sellerDeveloper")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className={FILTER_STYLES.label}>{t("furnishing")}</p>
          <Select
            value={filters.furnishing}
            onValueChange={(v) => updateFilter("furnishing", v)}
          >
            <SelectTrigger className={FILTER_STYLES.trigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-</SelectItem>
              <SelectItem value="unfurnished">{t("unfurnished")}</SelectItem>
              <SelectItem value="semi_furnished">{t("semiFurnished")}</SelectItem>
              <SelectItem value="furnished">{t("furnished")}</SelectItem>
              <SelectItem value="luxury">{t("luxuryFurnished")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className={FILTER_STYLES.label}>{t("bathrooms")}</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t("floorFrom")}
              value={filters.minBathrooms}
              onChange={(e) => updateFilter("minBathrooms", e.target.value)}
              className={`${FILTER_STYLES.input} flex-1`}
            />
            <Input
              type="number"
              placeholder={t("floorTo")}
              value={filters.maxBathrooms}
              onChange={(e) => updateFilter("maxBathrooms", e.target.value)}
              className={`${FILTER_STYLES.input} flex-1`}
            />
          </div>
        </div>

        <div>
          <p className={FILTER_STYLES.label}>{t("yearBuilt")}</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t("yearFrom")}
              value={filters.minYearBuilt}
              onChange={(e) => updateFilter("minYearBuilt", e.target.value)}
              className={`${FILTER_STYLES.input} flex-1`}
            />
            <Input
              type="number"
              placeholder={t("yearTo")}
              value={filters.maxYearBuilt}
              onChange={(e) => updateFilter("maxYearBuilt", e.target.value)}
              className={`${FILTER_STYLES.input} flex-1`}
            />
          </div>
        </div>

        <div>
          <p className={FILTER_STYLES.label}>{t("pricePerSqm")}</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t("floorFrom")}
              value={filters.minPricePerSqm}
              onChange={(e) => updateFilter("minPricePerSqm", e.target.value)}
              className={`${FILTER_STYLES.input} flex-1`}
            />
            <Input
              type="number"
              placeholder={t("floorTo")}
              value={filters.maxPricePerSqm}
              onChange={(e) => updateFilter("maxPricePerSqm", e.target.value)}
              className={`${FILTER_STYLES.input} flex-1`}
            />
          </div>
        </div>

        <div>
          <p className={FILTER_STYLES.label}>{t("material")}</p>
          <Select
            value={filters.material}
            onValueChange={(v) => updateFilter("material", v)}
          >
            <SelectTrigger className={FILTER_STYLES.trigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-</SelectItem>
              <SelectItem value="brick">{t("materialBrick")}</SelectItem>
              <SelectItem value="concrete">{t("materialConcrete")}</SelectItem>
              <SelectItem value="bca">{t("materialBca")}</SelectItem>
              <SelectItem value="wood">{t("materialWood")}</SelectItem>
              <SelectItem value="stone">{t("materialStone")}</SelectItem>
              <SelectItem value="mixed">{t("materialMixed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className={FILTER_STYLES.label}>{t("propertyCondition")}</p>
          <Select
            value={filters.condition}
            onValueChange={(v) => updateFilter("condition", v)}
          >
            <SelectTrigger className={FILTER_STYLES.trigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-</SelectItem>
              <SelectItem value="new_build">{t("conditionNewBuild")}</SelectItem>
              <SelectItem value="renovated">{t("conditionRenovated")}</SelectItem>
              <SelectItem value="good">{t("conditionGood")}</SelectItem>
              <SelectItem value="needs_renovation">
                {t("conditionNeedsRenovation")}
              </SelectItem>
              <SelectItem value="under_construction">
                {t("conditionUnderConstruction")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posted within */}
      <div>
        <p className={FILTER_STYLES.label}>{t("postedWithin")}</p>
        <div className="flex gap-5 mt-0.5">
          {[
            { value: "", label: t("anytime") },
            { value: "day", label: t("last24h") },
            { value: "3days", label: t("last3days") },
            { value: "7days", label: t("last7days") },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center ${
                  filters.postedWithin === opt.value
                    ? "border-primary"
                    : "border-border"
                }`}
              >
                {filters.postedWithin === opt.value && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <button
                type="button"
                onClick={() => updateFilter("postedWithin", opt.value)}
                className="text-sm text-foreground cursor-pointer"
              >
                {opt.label}
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <p className={FILTER_STYLES.label}>{t("amenities")}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2.5">
          {(
            [
              ["hasBalcony", t("balcony")],
              ["hasTerrace", t("terrace")],
              ["hasParking", t("parking")],
              ["hasGarage", t("garage")],
              ["hasSeparateKitchen", t("separateKitchen")],
              ["hasStorage", t("storage")],
              ["hasElevator", t("elevator")],
            ] as const
          ).map(([key, label]) => (
            <AmenityCheckbox
              key={key}
              checked={filters[key]}
              onToggle={() => toggleFilter(key)}
              label={label}
            />
          ))}
        </div>
      </div>

      <div className="mt-1">
        <AmenityCheckbox
          checked={filters.hasImages}
          onToggle={() => toggleFilter("hasImages")}
          label={t("hasImages")}
        />
      </div>
    </div>
  );
}
