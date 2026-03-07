"use client";

import Image from "next/image";
import type { Developer, Property, Locale } from "@tge/types";
import { localize, formatPrice } from "@tge/utils";
import {
  SectionHeading,
  ScrollReveal,
  AccentButton,
  Badge,
} from "@tge/ui";
import { Container } from "@/components/layout/container";
import { PropertyGrid } from "@/components/property/property-grid";
import { PropertySpecs } from "@/components/property/property-specs";
import { Link } from "@tge/i18n/navigation";
import { MapPin, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface SovereignPropertiesProps {
  developer: Developer;
  properties: Property[];
  locale: Locale;
}

export function SovereignProperties({
  developer,
  properties,
  locale,
}: SovereignPropertiesProps) {
  const t = useTranslations("DeveloperShowcase");

  const featuredProperty = properties[0];
  const featuredHeroImage = featuredProperty?.images.find((img) => img.isHero) ??
    featuredProperty?.images[0];

  return (
    <section id="properties" className="bg-[#101014] section-padding">
      <Container>
        <SectionHeading
          alignment="left"
          subtitle={t("propertyPortfolio")}
          title={t("exploreDevelopments")}
        />

        {properties.length >= 2 && featuredProperty && featuredHeroImage ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <ScrollReveal direction="left">
                <Link
                  href={`/properties/${featuredProperty.slug}`}
                  className="block relative aspect-[4/3] rounded-2xl overflow-hidden group"
                >
                  <Image
                    src={featuredHeroImage.src}
                    alt={localize(featuredHeroImage.alt, locale)}
                    fill
                    className="object-cover transition-transform duration-700 ease-luxury group-hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </Link>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={200}>
                <div className="flex flex-col justify-center h-full">
                  <Badge className="bg-copper/10 text-copper border-copper/20 mb-4 w-fit">
                    {featuredProperty.type}
                  </Badge>

                  <h3 className="font-serif text-2xl md:text-3xl text-cream mb-2">
                    {localize(featuredProperty.title, locale)}
                  </h3>

                  <div className="flex items-center gap-2 text-cream-muted text-sm mb-4">
                    <MapPin className="h-4 w-4 text-copper/60" />
                    <span>
                      {featuredProperty.location.neighborhood},{" "}
                      {featuredProperty.location.city}
                    </span>
                  </div>

                  <PropertySpecs
                    specs={featuredProperty.specs}
                    variant="full"
                    className="mb-6"
                  />

                  <p className="font-serif text-2xl text-copper mb-4">
                    {formatPrice(featuredProperty.price, locale)}
                  </p>

                  <p className="text-cream-muted leading-relaxed line-clamp-3 mb-6">
                    {localize(featuredProperty.description, locale)}
                  </p>

                  <div>
                    <AccentButton asChild>
                      <Link
                        href={`/properties/${featuredProperty.slug}`}
                        className="inline-flex items-center gap-2"
                      >
                        {t("viewProperty")}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </AccentButton>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {properties.length > 1 && (
              <PropertyGrid properties={properties.slice(1)} />
            )}
          </>
        ) : (
          <PropertyGrid properties={properties} />
        )}
      </Container>
    </section>
  );
}
