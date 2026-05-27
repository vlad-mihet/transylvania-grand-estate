"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { City } from "@tge/types";
import { Container } from "@/components/layout/container";

interface CityShowcaseProps {
  cities: City[];
}

export function CityShowcase({ cities }: CityShowcaseProps) {
  const t = useTranslations("HomePage.cities");
  // Lead with the curated featured cities; the rest live on /cities.
  const featured = cities.slice(0, 8);

  return (
    <section className="py-12 sm:py-14 md:py-20">
      <Container>
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            {t("title")}
          </h2>
          <Link
            href="/cities"
            className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
          >
            {t("viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {featured.map((city) => (
            <Link
              key={city.slug}
              href={{ pathname: "/properties", query: { city: city.slug } }}
              className="group"
            >
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden">
                <Image
                  src={city.image}
                  alt={city.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <p className="mt-3 font-semibold text-foreground text-sm">
                {city.name}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
