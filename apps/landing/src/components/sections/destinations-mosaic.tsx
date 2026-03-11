"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { City } from "@tge/types";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@tge/ui";
import { ScrollReveal } from "@tge/ui";

interface DestinationsMosaicProps {
  cities: City[];
}

function MosaicCell({
  city,
  className,
  label,
}: {
  city: City;
  className?: string;
  label: string;
}) {
  return (
    <Link href={`/cities/${city.slug}`} className={className}>
      <div className="relative w-full h-full rounded-2xl overflow-hidden group cursor-pointer">
        <Image
          src={city.image}
          alt={city.name}
          fill
          className="object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-700 ease-out"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/60 transition-colors duration-500" />

        {/* City info */}
        <div className="absolute bottom-0 inset-x-0 p-6 md:p-8">
          <h3 className="font-serif text-2xl md:text-3xl text-cream mb-1">
            {city.name}
          </h3>
          <p className="text-cream-muted/60 text-sm tracking-wide">
            {label}
          </p>
        </div>

        {/* Explore text on hover */}
        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <span className="text-cream/70 text-xs uppercase tracking-[0.2em]">
            Explore
          </span>
        </div>
      </div>
    </Link>
  );
}

export function DestinationsMosaic({ cities }: DestinationsMosaicProps) {
  const t = useTranslations("TransylvaniaPage.destinations");

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading
          title={t("title")}
          subtitle={t("subtitle")}
          alignment="right"
        />

        {/* Mosaic grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          {/* Row 1: Large + Small */}
          {cities[0] && (
            <ScrollReveal className="md:col-span-7 aspect-[16/10] md:aspect-auto md:h-[400px]">
              <MosaicCell
                city={cities[0]}
                className="block h-full"
                label={t("estatesAwait", { count: cities[0].propertyCount })}
              />
            </ScrollReveal>
          )}
          {cities[1] && (
            <ScrollReveal delay={100} className="md:col-span-5 aspect-square md:aspect-auto md:h-[400px]">
              <MosaicCell
                city={cities[1]}
                className="block h-full"
                label={t("estatesAwait", { count: cities[1].propertyCount })}
              />
            </ScrollReveal>
          )}

          {/* Row 2: Small + Large */}
          {cities[2] && (
            <ScrollReveal delay={200} className="md:col-span-5 aspect-square md:aspect-auto md:h-[400px]">
              <MosaicCell
                city={cities[2]}
                className="block h-full"
                label={t("estatesAwait", { count: cities[2].propertyCount })}
              />
            </ScrollReveal>
          )}
          {cities[3] && (
            <ScrollReveal delay={300} className="md:col-span-7 aspect-[16/10] md:aspect-auto md:h-[400px]">
              <MosaicCell
                city={cities[3]}
                className="block h-full"
                label={t("estatesAwait", { count: cities[3].propertyCount })}
              />
            </ScrollReveal>
          )}

          {/* Row 3: Full-width strip for 5th city */}
          {cities[4] && (
            <ScrollReveal delay={400} className="md:col-span-12 aspect-[4/1] min-h-[140px]">
              <MosaicCell
                city={cities[4]}
                className="block h-full"
                label={t("estatesAwait", { count: cities[4].propertyCount })}
              />
            </ScrollReveal>
          )}
        </div>
      </Container>
    </section>
  );
}
