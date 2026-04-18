"use client";

import { useLocale } from "next-intl";
import type { Locale, LocalizedString } from "@tge/types";
import { localize } from "@tge/utils";
import { Check } from "lucide-react";
import { cn } from "@tge/utils";

export type PropertyFeaturesTone = "luxury" | "light";

interface PropertyFeaturesProps {
  features: LocalizedString[];
  tone?: PropertyFeaturesTone;
  className?: string;
}

const toneClasses: Record<
  PropertyFeaturesTone,
  { iconBg: string; icon: string; text: string }
> = {
  light: {
    iconBg: "bg-primary/10",
    icon: "text-primary",
    text: "text-muted-foreground",
  },
  luxury: {
    iconBg: "bg-copper/10",
    icon: "text-copper",
    text: "text-cream-muted",
  },
};

export function PropertyFeatures({
  features,
  tone = "light",
  className,
}: PropertyFeaturesProps) {
  const locale = useLocale() as Locale;
  const palette = toneClasses[tone];

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-3">
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
              palette.iconBg,
            )}
          >
            <Check className={cn("h-3 w-3", palette.icon)} />
          </div>
          <span className={cn("text-sm", palette.text)}>
            {localize(feature, locale)}
          </span>
        </div>
      ))}
    </div>
  );
}
