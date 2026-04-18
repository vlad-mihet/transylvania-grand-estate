"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { City } from "@tge/types";
import { Container } from "@/components/layout/container";

interface CityShowcaseProps {
  cities: City[];
}

export function CityShowcase({ cities }: CityShowcaseProps) {
  const t = useTranslations("HomePage.cities");

  return (
    <section className="py-12 sm:py-14 md:py-20">
      <Container>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-6 sm:mb-8">
          {t("title")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
          {cities.map((city) => (
            <Link
              key={city.slug}
              href={`/properties?city=${city.slug}`}
              className="group"
            >
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src={city.image}
                  alt={city.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
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
