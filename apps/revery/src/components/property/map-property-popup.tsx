"use client";

import { MapPin as MapPinType } from "@tge/types";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@tge/types";
import { formatPrice } from "@tge/utils";

interface MapPropertyPopupProps {
  pin: MapPinType;
}

export function MapPropertyPopup({ pin }: MapPropertyPopupProps) {
  const locale = useLocale() as Locale;
  const tTypes = useTranslations("Common.propertyTypes");

  return (
    <div className="w-[220px] font-sans">
      {pin.heroImageSrc && (
        <div className="w-full h-[120px] overflow-hidden rounded-t-lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- Leaflet popups render outside React's tree; next/image's layout primitives break inside them. */}
          <img
            src={pin.heroImageSrc}
            alt={pin.slug}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-2.5">
        <p className="text-base font-bold text-foreground">
          {formatPrice(pin.price, locale)}
        </p>
        <p className="text-xs text-primary font-medium uppercase tracking-wide mt-0.5">
          {tTypes(pin.type)}
        </p>
        <a
          href={`/${locale}/properties/${pin.slug}`}
          className="text-xs text-primary hover:underline mt-1.5 inline-block"
        >
          {locale === "ro" ? "Vezi detalii →" : "View details →"}
        </a>
      </div>
    </div>
  );
}
