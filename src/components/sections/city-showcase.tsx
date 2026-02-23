"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cities } from "@/data/cities";
import { Locale } from "@/types/property";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export function CityShowcase() {
  const t = useTranslations("HomePage.cities");
  const locale = useLocale() as Locale;

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.slice(0, 3).map((city, index) => (
            <ScrollReveal key={city.slug} delay={index * 100}>
              <Link href={`/properties?city=${city.slug}`}>
                <div className="relative aspect-[3/2] rounded-2xl overflow-hidden group cursor-pointer">
                  <Image
                    src={city.image}
                    alt={city.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-6">
                    <h3 className="font-serif text-2xl text-cream mb-1">
                      {city.name}
                    </h3>
                    <p className="text-cream-muted text-sm">
                      {city.propertyCount} properties
                    </p>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          {cities.slice(3).map((city, index) => (
            <ScrollReveal key={city.slug} delay={(index + 3) * 100}>
              <Link href={`/properties?city=${city.slug}`}>
                <div className="relative aspect-[3/2] rounded-2xl overflow-hidden group cursor-pointer">
                  <Image
                    src={city.image}
                    alt={city.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-6">
                    <h3 className="font-serif text-2xl text-cream mb-1">
                      {city.name}
                    </h3>
                    <p className="text-cream-muted text-sm">
                      {city.propertyCount} properties
                    </p>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
