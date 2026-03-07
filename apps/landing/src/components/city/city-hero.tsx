"use client";

import Image from "next/image";
import type { City, Locale } from "@tge/types";
import { localize } from "@tge/utils";

interface CityHeroProps {
  city: City;
  locale: Locale;
  subtitle: string;
}

export function CityHero({ city, locale, subtitle }: CityHeroProps) {
  return (
    <section className="relative h-[70vh] w-full overflow-hidden">
      {/* Background image */}
      <Image
        src={city.image}
        alt={city.name}
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      {/* Overlay layers */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10">
        <p className="text-copper uppercase tracking-[0.3em] text-xs md:text-sm font-medium mb-6 animate-fade-in">
          {subtitle}
        </p>

        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-cream leading-[1.1] mb-6 animate-slide-up">
          {city.name}
        </h1>

        <p className="text-cream-muted max-w-2xl text-base md:text-lg leading-relaxed animate-fade-in" style={{ animationDelay: "200ms" }}>
          {localize(city.description, locale)}
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
        <div className="w-px h-16 bg-gradient-to-b from-copper/60 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
