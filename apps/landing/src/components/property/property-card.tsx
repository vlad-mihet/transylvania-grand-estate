"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Property, Locale } from "@tge/types";
import { formatPrice, localize } from "@tge/utils";
import { PropertySpecs, Badge } from "@tge/ui";
import { Card, CardContent } from "@tge/ui";
import { MapPin, ImageOff } from "lucide-react";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const locale = useLocale() as Locale;
  const tTypes = useTranslations("Common.propertyTypes");
  const tCommon = useTranslations("Common");
  const heroImage = property.images.find((img) => img.isHero) || property.images[0];

  return (
    <Link href={`/properties/${property.slug}`}>
      <Card className="bg-card border-copper/[0.08] overflow-hidden group cursor-pointer p-0 gap-0 shadow-none hover:border-copper/20 hover:shadow-[0_12px_48px_-12px_rgba(196,127,90,0.12)] transition-all duration-700">
        <div className="relative aspect-[4/3] overflow-hidden">
          {heroImage ? (
            <Image
              src={heroImage.src}
              alt={localize(heroImage.alt, locale)}
              fill
              className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-copper/10 to-background flex items-center justify-center">
              <ImageOff className="h-10 w-10 text-copper/40" />
            </div>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-copper/85 text-background text-[10px] uppercase tracking-[0.15em] font-semibold px-3 py-1.5">
              {tTypes(property.type)}
            </Badge>
            {property.new && (
              <Badge className="bg-white/[0.08] backdrop-blur-md text-cream text-[10px] uppercase tracking-[0.15em] font-semibold border border-white/15 px-3 py-1.5">{tCommon("new")}</Badge>
            )}
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-16">
            <span className="text-copper-light font-serif text-xl tracking-wide">
              {formatPrice(property.price, locale)}
            </span>
          </div>
        </div>
        <CardContent className="p-6 pt-5">
          <h3 className="font-serif text-lg text-cream line-clamp-1 mb-2 group-hover:text-copper transition-colors duration-700">
            {localize(property.title, locale)}
          </h3>
          <div className="flex items-center gap-2 text-cream-muted/80 text-sm mb-4">
            <MapPin className="h-3.5 w-3.5 text-copper/70" />
            <span>
              {property.location.neighborhood}, {property.location.city}
            </span>
          </div>
          <div className="border-t border-copper/[0.06] pt-4 mt-2">
            <PropertySpecs
              specs={property.specs}
              propertyType={property.type}
              variant="compact"
              tone="luxury"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
