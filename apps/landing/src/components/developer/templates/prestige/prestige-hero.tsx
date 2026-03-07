"use client";

import Image from "next/image";
import { Link } from "@tge/i18n/navigation";
import type { Developer, Property, Locale } from "@tge/types";
import { localize } from "@tge/utils";

interface PrestigeHeroProps {
  developer: Developer;
  properties: Property[];
  locale: Locale;
}

export function PrestigeHero({
  developer,
  properties,
  locale,
}: PrestigeHeroProps) {
  const firstHeroImage = properties
    .flatMap((p) => p.images)
    .find((img) => img.isHero);
  const backgroundSrc =
    developer.coverImage ?? firstHeroImage?.src ?? properties[0]?.images[0]?.src;

  const tagline = developer.tagline
    ? localize(developer.tagline, locale)
    : null;

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background image */}
      {backgroundSrc && (
        <Image
          src={backgroundSrc}
          alt={developer.name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      )}

      {/* Overlay layers */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

      {/* Logo pill */}
      {developer.logo && (
        <div className="absolute top-28 left-8 z-10">
          <div className="frosted-glass-overlay rounded-full px-5 py-2.5 flex items-center gap-3">
            <Image
              src={developer.logo}
              alt={`${developer.name} logo`}
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-cream text-sm font-medium tracking-wide">
              {developer.name}
            </span>
          </div>
        </div>
      )}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10">
        {tagline && (
          <p className="text-copper uppercase tracking-[0.3em] text-xs md:text-sm font-medium mb-6 animate-fade-in">
            {tagline}
          </p>
        )}

        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-cream leading-[1.1] mb-6 animate-slide-up">
          {developer.name}
        </h1>

        <Link
          href={`/cities/${developer.citySlug}`}
          className="text-cream-muted tracking-[0.2em] uppercase text-sm md:text-base animate-fade-in hover:text-copper transition-colors duration-300"
        >
          {developer.city}
        </Link>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
        <div className="w-px h-16 bg-gradient-to-b from-copper/60 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
