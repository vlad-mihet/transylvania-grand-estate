"use client";

import { useTranslations } from "next-intl";
import { PropertySpecs as PropertySpecsType } from "@tge/types";
import { Bed, Bath, Ruler, Layers, Calendar, Car } from "lucide-react";
import { cn } from "@tge/utils";

interface PropertySpecsProps {
  specs: PropertySpecsType;
  variant?: "compact" | "full";
  className?: string;
}

const specConfig = [
  { key: "bedrooms" as const, icon: Bed, labelKey: "bedrooms" as const, suffix: "" },
  { key: "bathrooms" as const, icon: Bath, labelKey: "bathrooms" as const, suffix: "" },
  { key: "area" as const, icon: Ruler, labelKey: "area" as const, suffix: " m²" },
  { key: "floors" as const, icon: Layers, labelKey: "floors" as const, suffix: "" },
  { key: "yearBuilt" as const, icon: Calendar, labelKey: "yearBuilt" as const, suffix: "" },
  { key: "garage" as const, icon: Car, labelKey: "garage" as const, suffix: "" },
];

export function PropertySpecs({
  specs,
  variant = "compact",
  className,
}: PropertySpecsProps) {
  const t = useTranslations("PropertyDetail.specs");

  const compactKeys = ["bedrooms", "bathrooms", "area"];
  const displaySpecs = variant === "compact"
    ? specConfig.filter((s) => compactKeys.includes(s.key))
    : specConfig;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2",
        variant === "full" && "gap-x-6 gap-y-3",
        className
      )}
    >
      {displaySpecs.map(({ key, icon: Icon, labelKey, suffix }) => {
        const value = specs[key as keyof PropertySpecsType];
        if (value === undefined || value === false) return null;

        return (
          <div key={key} className={cn(
            "flex items-center gap-2",
            variant === "compact" ? "text-cream-muted/80" : "text-cream-muted"
          )}>
            <Icon className={cn(
              variant === "compact" ? "h-3.5 w-3.5 text-copper/60" : "h-4 w-4 text-copper"
            )} />
            <span className={cn(variant === "compact" ? "text-[13px]" : "text-sm")}>
              {String(value)}
              {suffix || ""}
            </span>
            {variant === "full" && (
              <span className="text-xs text-cream-muted/60 ml-0.5">
                {t(labelKey)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
