"use client";

import { useTranslations } from "next-intl";
import type { PropertySpecs as PropertySpecsType, PropertyType } from "@tge/types";
import { Bed, Bath, Ruler, Layers, Calendar, Car, LandPlot } from "lucide-react";
import { cn } from "@tge/utils";

export type PropertySpecsTone = "luxury" | "light";

interface PropertySpecsProps {
  specs: PropertySpecsType;
  propertyType?: PropertyType;
  variant?: "compact" | "full";
  tone?: PropertySpecsTone;
  className?: string;
}

const defaultSpecConfig = [
  { key: "bedrooms" as const, icon: Bed, labelKey: "bedrooms" as const, suffix: "" },
  { key: "bathrooms" as const, icon: Bath, labelKey: "bathrooms" as const, suffix: "" },
  { key: "area" as const, icon: Ruler, labelKey: "area" as const, suffix: " m²" },
  { key: "floors" as const, icon: Layers, labelKey: "floors" as const, suffix: "" },
  { key: "yearBuilt" as const, icon: Calendar, labelKey: "yearBuilt" as const, suffix: "" },
  { key: "garage" as const, icon: Car, labelKey: "garage" as const, suffix: "" },
];

const terrainSpecConfig = [
  { key: "landArea" as const, icon: LandPlot, labelKey: "landArea" as const, suffix: " m²" },
  { key: "area" as const, icon: Ruler, labelKey: "area" as const, suffix: " m²" },
];

const toneClasses: Record<
  PropertySpecsTone,
  {
    rowCompact: string;
    rowFull: string;
    iconCompact: string;
    iconFull: string;
    labelFull: string;
  }
> = {
  light: {
    rowCompact: "text-muted-foreground",
    rowFull: "text-muted-foreground",
    iconCompact: "text-primary",
    iconFull: "text-primary",
    labelFull: "text-muted-foreground",
  },
  luxury: {
    rowCompact: "text-cream-muted/80",
    rowFull: "text-cream-muted",
    iconCompact: "text-copper/60",
    iconFull: "text-copper",
    labelFull: "text-cream-muted/60",
  },
};

export function PropertySpecs({
  specs,
  propertyType,
  variant = "compact",
  tone = "light",
  className,
}: PropertySpecsProps) {
  const t = useTranslations("PropertyDetail.specs");

  const isTerrain = propertyType === "terrain";
  const specConfig = isTerrain ? terrainSpecConfig : defaultSpecConfig;

  const compactKeys = isTerrain
    ? ["landArea", "area"]
    : ["bedrooms", "bathrooms", "area"];
  const displaySpecs =
    variant === "compact"
      ? specConfig.filter((s) => compactKeys.includes(s.key))
      : specConfig;

  const palette = toneClasses[tone];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2",
        variant === "full" && "gap-x-6 gap-y-3",
        className,
      )}
    >
      {displaySpecs.map(({ key, icon: Icon, labelKey, suffix }) => {
        const value = specs[key as keyof PropertySpecsType];
        if (
          value === undefined ||
          value === false ||
          value === 0 ||
          value === null
        )
          return null;

        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-2",
              variant === "compact" ? palette.rowCompact : palette.rowFull,
            )}
          >
            <Icon
              className={cn(
                variant === "compact"
                  ? `h-3.5 w-3.5 ${palette.iconCompact}`
                  : `h-4 w-4 ${palette.iconFull}`,
              )}
            />
            <span
              className={cn(
                variant === "compact" ? "text-[13px]" : "text-sm",
              )}
            >
              {String(value)}
              {suffix || ""}
            </span>
            {variant === "full" && (
              <span className={cn("text-xs ml-0.5", palette.labelFull)}>
                {t(labelKey)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
