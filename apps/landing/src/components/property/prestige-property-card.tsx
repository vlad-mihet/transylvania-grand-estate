"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Property, Locale } from "@tge/types";
import { formatPrice, localize } from "@tge/utils";
import { Bed, Bath, Maximize, LandPlot } from "lucide-react";

interface PrestigePropertyCardProps {
  property: Property;
  aspectRatio?: "portrait" | "landscape" | "square";
}

export function PrestigePropertyCard({
  property,
  aspectRatio = "portrait",
}: PrestigePropertyCardProps) {
  const locale = useLocale() as Locale;
  const heroImage =
    property.images.find((img) => img.isHero) || property.images[0];

  const aspectClass = {
    portrait: "aspect-[2/3]",
    landscape: "aspect-[4/3]",
    square: "aspect-square",
  }[aspectRatio];

  return (
    <Link href={`/properties/${property.slug}`} className="block group">
      <div className={`relative ${aspectClass} rounded-2xl overflow-hidden`}>
        <Image
          src={heroImage.src}
          alt={localize(heroImage.alt, locale)}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Permanent gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Property info — always visible at bottom */}
        <div className="absolute bottom-0 inset-x-0 p-6 md:p-8">
          <p className="text-cream-muted/60 text-xs uppercase tracking-[0.15em] mb-2">
            {property.location.city}
          </p>
          <h3 className="font-serif text-xl md:text-2xl text-cream leading-tight mb-2 group-hover:text-copper-light transition-colors duration-500">
            {localize(property.title, locale)}
          </h3>
          <p className="text-copper text-sm tracking-wide">
            {formatPrice(property.price, locale)}
          </p>
        </div>

        {/* Specs panel — slides up on hover */}
        <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
          <div className="bg-background/80 backdrop-blur-xl border-t border-copper/10 px-6 md:px-8 py-4">
            <div className="flex items-center gap-6 text-cream-muted text-sm">
              {property.type === "terrain" ? (
                <>
                  {property.specs.landArea && property.specs.landArea > 0 && (
                    <span className="flex items-center gap-1.5">
                      <LandPlot className="h-3.5 w-3.5 text-copper/70" />
                      {property.specs.landArea} m&sup2;
                    </span>
                  )}
                  {property.specs.area > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Maximize className="h-3.5 w-3.5 text-copper/70" />
                      {property.specs.area} m&sup2;
                    </span>
                  )}
                </>
              ) : (
                <>
                  {property.specs.bedrooms > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Bed className="h-3.5 w-3.5 text-copper/70" />
                      {property.specs.bedrooms}
                    </span>
                  )}
                  {property.specs.bathrooms > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Bath className="h-3.5 w-3.5 text-copper/70" />
                      {property.specs.bathrooms}
                    </span>
                  )}
                  {property.specs.area > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Maximize className="h-3.5 w-3.5 text-copper/70" />
                      {property.specs.area} m&sup2;
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
