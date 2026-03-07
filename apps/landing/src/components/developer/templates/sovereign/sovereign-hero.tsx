"use client";

import Image from "next/image";
import type { Developer, Property, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { AccentButton } from "@tge/ui";
import { Link } from "@tge/i18n/navigation";
import { InquiryTrigger } from "@/components/inquiry";
import { MapPin, Building2, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

interface SovereignHeroProps {
  developer: Developer;
  properties: Property[];
  locale: Locale;
}

export function SovereignHero({
  developer,
  properties,
  locale,
}: SovereignHeroProps) {
  const t = useTranslations("DeveloperShowcase");

  const firstHeroImage = properties
    .flatMap((p) => p.images)
    .find((img) => img.isHero);
  const backgroundSrc =
    developer.coverImage ??
    firstHeroImage?.src ??
    properties[0]?.images[0]?.src;

  const taglineText = developer.tagline
    ? localize(developer.tagline, locale)
    : localize(developer.shortDescription, locale);

  const shortDesc = localize(developer.shortDescription, locale);

  return (
    <section className="relative h-screen min-h-[700px] w-full overflow-hidden">
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

      <div className="absolute inset-0 bg-black/60 z-[1]" />

      <div className="relative z-10 flex items-center justify-center h-full px-4 pt-28">
        <div className="frosted-glass-overlay max-w-2xl w-full p-8 md:p-12 text-center animate-slide-up">
          {developer.logo && (
            <div className="flex justify-center mb-6">
              <div className="relative h-14 w-auto">
                <Image
                  src={developer.logo}
                  alt={`${developer.name} logo`}
                  width={120}
                  height={56}
                  className="h-14 w-auto object-contain"
                />
              </div>
            </div>
          )}

          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-cream mb-3">
            {developer.name}
          </h1>

          <p className="text-copper text-base md:text-lg italic font-serif mb-6">
            {taglineText}
          </p>

          <p className="text-cream-muted leading-relaxed mb-8 max-w-lg mx-auto">
            {shortDesc}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <AccentButton size="lg" asChild>
              <a href="#properties">{t("exploreProperties")}</a>
            </AccentButton>
            <InquiryTrigger
              context={{
                type: "developer",
                entityName: developer.name,
                entitySlug: developer.slug,
              }}
            >
              <AccentButton accentVariant="outline" size="lg">
                {t("contactDeveloper")}
              </AccentButton>
            </InquiryTrigger>
          </div>

          <div className="border-t border-copper/10 pt-6 mt-2 flex justify-center items-center flex-wrap gap-6 text-sm text-cream-muted">
            <Link
              href={`/cities/${developer.citySlug}`}
              className="flex items-center gap-2 hover:text-copper transition-colors duration-300"
            >
              <MapPin className="h-4 w-4 text-copper/60" />
              {developer.city}
            </Link>
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-copper/60" />
              {t("projects", { count: developer.projectCount })}
            </span>
            {developer.website && (
              <a
                href={developer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-copper transition-colors duration-300 ease-luxury"
              >
                <ExternalLink className="h-4 w-4 text-copper/60" />
                {t("visitWebsite")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
