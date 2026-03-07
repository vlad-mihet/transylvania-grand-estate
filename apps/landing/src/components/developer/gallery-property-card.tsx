"use client";

import Image from "next/image";
import { Link } from "@tge/i18n/navigation";
import { Locale, Property } from "@tge/types";
import { localize, formatPrice } from "@tge/utils";
import { MapPin } from "lucide-react";

interface GalleryPropertyCardProps {
  property: Property;
  locale: Locale;
  aspectRatio?: "landscape" | "portrait" | "fill";
  className?: string;
}

export function GalleryPropertyCard({
  property,
  locale,
  aspectRatio = "landscape",
  className = "",
}: GalleryPropertyCardProps) {
  const heroImage = property.images.find((img) => img.isHero) ?? property.images[0];
  const aspectClass =
    aspectRatio === "portrait"
      ? "aspect-[3/4]"
      : aspectRatio === "fill"
        ? "aspect-[16/10] lg:aspect-auto lg:h-full"
        : "aspect-[16/10]";

  return (
    <Link
      href={`/properties/${property.slug}`}
      className={`relative ${aspectClass} rounded-xl overflow-hidden group block ring-1 ring-transparent hover:ring-copper/25 transition-all duration-500 ${className}`}
    >
      {heroImage && (
        <Image
          src={heroImage.src}
          alt={localize(heroImage.alt, locale)}
          fill
          className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-luxury"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
        />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Content - slides up on hover */}
      <div className="absolute bottom-0 inset-x-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 opacity-0 group-hover:opacity-100">
        <h3 className="font-serif text-xl text-cream mb-1">
          {localize(property.title, locale)}
        </h3>
        <p className="flex items-center gap-1.5 text-cream-muted text-sm mb-2">
          <MapPin className="h-3.5 w-3.5 text-copper/60" />
          {property.location.city}
          {property.location.neighborhood && `, ${property.location.neighborhood}`}
        </p>
        <p className="text-copper font-serif text-lg">
          {formatPrice(property.price, locale)}
        </p>
      </div>

      {/* Persistent bottom gradient for depth */}
      <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent group-hover:opacity-0 transition-opacity duration-500" />
    </Link>
  );
}
