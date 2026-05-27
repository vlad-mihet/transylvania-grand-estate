"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { City } from "@tge/types";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@tge/ui";
import { ScrollReveal } from "@tge/ui";
import { AccentButton } from "@tge/ui";
import { ArrowRight } from "lucide-react";

interface CityShowcaseProps {
  cities: City[];
}

export function CityShowcase({ cities }: CityShowcaseProps) {
  const t = useTranslations("HomePage.cities");
  // Lead with the curated featured cities; the rest live on /cities.
  const featured = cities.slice(0, 8);

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {featured.map((city, index) => (
            <ScrollReveal key={city.slug} delay={Math.min(index * 80, 600)}>
              <Link href={`/cities/${city.slug}`}>
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden group cursor-pointer">
                  <Image
                    src={city.image}
                    alt={city.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-6">
                    <h3 className="font-serif text-2xl md:text-3xl text-cream mb-1">
                      {city.name}
                    </h3>
                    <p className="text-cream-muted text-sm">
                      {t("propertyCount", { count: city.propertyCount })}
                    </p>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <AccentButton accentVariant="outline" asChild>
            <Link href="/cities" className="inline-flex items-center gap-2">
              {t("viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </AccentButton>
        </div>
      </Container>
    </section>
  );
}
