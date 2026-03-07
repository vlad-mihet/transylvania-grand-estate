"use client";

import Image from "next/image";
import type { Developer, Property, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { AccentButton } from "@tge/ui";
import { Link } from "@tge/i18n/navigation";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

interface AtelierHeroProps {
  developer: Developer;
  properties: Property[];
  locale: Locale;
}

export function AtelierHero({
  developer,
  properties,
  locale,
}: AtelierHeroProps) {
  const t = useTranslations("DeveloperShowcase");

  const tagline = developer.tagline
    ? localize(developer.tagline, locale)
    : null;

  const shortDesc = localize(developer.shortDescription, locale);

  const heroImage = properties
    .flatMap((p) => p.images)
    .find((img) => img.isHero);
  const backgroundSrc =
    developer.coverImage ?? heroImage?.src ?? properties[0]?.images[0]?.src;

  return (
    <section className="h-screen min-h-[700px] grid grid-cols-1 lg:grid-cols-2">
      {/* Left panel */}
      <div className="bg-background flex flex-col justify-center px-8 md:px-12 lg:px-16 xl:px-20 pt-32 pb-16">
        {developer.logo && (
          <div className="relative h-10 w-32 mb-10 opacity-50">
            <Image
              src={developer.logo}
              alt={`${developer.name} logo`}
              fill
              className="object-contain object-left"
            />
          </div>
        )}

        {tagline && (
          <p className="text-copper uppercase tracking-[0.25em] text-xs mb-4 animate-fade-in">
            {tagline}
          </p>
        )}

        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-cream leading-tight mb-6 animate-slide-up">
          {developer.name}
        </h1>

        <p className="text-cream-muted text-lg leading-relaxed mb-8 max-w-md animate-fade-in">
          {shortDesc}
        </p>

        <div className="flex items-center gap-4 animate-fade-in">
          <AccentButton accentVariant="solid" asChild>
            <a href="#projects">{t("viewProjects")}</a>
          </AccentButton>
          {developer.website && (
            <AccentButton accentVariant="outline" asChild>
              <a
                href={developer.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("visitWebsite")}
              </a>
            </AccentButton>
          )}
        </div>

        <div className="flex items-center gap-6 mt-auto pt-8 border-t border-copper/10">
          <div>
            <span className="text-copper font-serif text-lg">
              {developer.projectCount}
            </span>
            <span className="text-cream-muted text-sm ml-2">
              {t("projectsLabel")}
            </span>
          </div>
          <div className="w-px h-4 bg-copper/20" />
          <Link
            href={`/cities/${developer.citySlug}`}
            className="flex items-center gap-1.5 text-cream-muted text-sm hover:text-copper transition-colors duration-300"
          >
            <MapPin className="h-4 w-4 text-copper/60" />
            {developer.city}
          </Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative overflow-hidden hidden lg:block">
        {backgroundSrc && (
          <Image
            src={backgroundSrc}
            alt={developer.name}
            fill
            priority
            className="object-cover"
            sizes="50vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/30 to-transparent z-[1]" />
      </div>
    </section>
  );
}
