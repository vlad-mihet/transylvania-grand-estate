"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Property, Locale } from "@tge/types";
import { formatPrice, localize } from "@tge/utils";
import { Card, PropertySpecs } from "@tge/ui";
import { MapPin } from "lucide-react";

interface PropertyCardProps {
  property: Property;
}

// Reveria's property card: clean, muted, purple accents. Keeps the brand
// divergence from landing's luxury card (different aspect ratio, no badge
// overlay, price below image, no title) but shares the spec renderer via
// PropertySpecs from @tge/ui — previously reimplemented inline.
export function PropertyCard({ property }: PropertyCardProps) {
  const locale = useLocale() as Locale;
  const tTypes = useTranslations("Common.propertyTypes");
  const heroImage = property.images.find((img) => img.isHero) || property.images[0];

  return (
    <Link href={`/properties/${property.slug}`}>
      <Card className="overflow-hidden group cursor-pointer border border-border hover:shadow-md transition-shadow duration-300 p-0 gap-0 bg-card rounded-xl">
        <div className="relative aspect-[16/10] overflow-hidden">
          {heroImage && (
            <Image
              src={heroImage.src}
              alt={localize(heroImage.alt, locale)}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          )}
        </div>
        <div className="p-4">
          <p className="text-lg font-bold text-foreground mb-1">
            {formatPrice(property.price, locale)}
          </p>
          <p className="text-xs text-primary font-medium uppercase tracking-wide mb-2">
            {tTypes(property.type)}
          </p>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-3">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {property.location.neighborhood}, {property.location.city}
            </span>
          </div>
          <div className="border-t border-border pt-3">
            <PropertySpecs
              specs={property.specs}
              propertyType={property.type}
              variant="compact"
              tone="light"
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
