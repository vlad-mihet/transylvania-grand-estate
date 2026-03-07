"use client";

import { useLocale } from "next-intl";
import { LocalizedString, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Check } from "lucide-react";

interface PropertyFeaturesProps {
  features: LocalizedString[];
}

export function PropertyFeatures({ features }: PropertyFeaturesProps) {
  const locale = useLocale() as Locale;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-copper/10 flex items-center justify-center flex-shrink-0">
            <Check className="h-3 w-3 text-copper" />
          </div>
          <span className="text-cream-muted text-sm">{localize(feature, locale)}</span>
        </div>
      ))}
    </div>
  );
}
