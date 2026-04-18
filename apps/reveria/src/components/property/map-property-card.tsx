"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Property, Locale } from "@tge/types";
import { formatPrice, formatArea, localize } from "@tge/utils";
import { MapPin, Bed, Bath, Maximize } from "lucide-react";

interface MapPropertyCardProps {
  property: Property;
  isActive?: boolean;
  onHover?: (slug: string | null) => void;
}

export function MapPropertyCard({ property, isActive, onHover }: MapPropertyCardProps) {
  const locale = useLocale() as Locale;
  const tTypes = useTranslations("Common.propertyTypes");
  const heroImage = property.images.find((img) => img.isHero) || property.images[0];

  return (
    <Link
      href={{ pathname: "/properties/[slug]", params: { slug: property.slug } }}
      onMouseEnter={() => onHover?.(property.slug)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div
        className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
          isActive
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
        }`}
      >
        {/* Thumbnail */}
        <div className="relative w-[120px] h-[90px] shrink-0 rounded-lg overflow-hidden">
          {heroImage && (
            <Image
              src={heroImage.src}
              alt={localize(heroImage.alt, locale)}
              fill
              className="object-cover"
              sizes="120px"
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">
              {formatPrice(property.price, locale)}
            </p>
            <p className="text-[10px] text-primary font-medium uppercase tracking-wider mt-0.5">
              {tTypes(property.type)}
            </p>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground mt-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="text-xs truncate">
              {property.location.neighborhood}, {property.location.city}
            </span>
          </div>

          {property.type !== "terrain" && (
            <div className="flex items-center gap-3 text-muted-foreground text-xs mt-1">
              {property.specs.bedrooms > 0 && (
                <span className="flex items-center gap-0.5">
                  <Bed className="h-3 w-3" /> {property.specs.bedrooms}
                </span>
              )}
              {property.specs.bathrooms > 0 && (
                <span className="flex items-center gap-0.5">
                  <Bath className="h-3 w-3" /> {property.specs.bathrooms}
                </span>
              )}
              <span className="flex items-center gap-0.5">
                <Maximize className="h-3 w-3" /> {formatArea(property.specs.area, locale)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
