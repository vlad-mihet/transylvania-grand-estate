"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import type { City, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { ArrowRight, Building2 } from "lucide-react";

interface CityCardProps {
  city: City;
  developerCount: number;
}

export function CityCard({ city, developerCount }: CityCardProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("CitiesPage.card");

  return (
    <Link href={`/cities/${city.slug}`}>
      <div className="frosted-glass overflow-hidden group hover:border-copper/20 hover:shadow-[0_8px_32px_-8px_rgba(196,127,90,0.08)] transition-all duration-300">
        <div className="relative aspect-[3/2] overflow-hidden">
          <Image
            src={city.image}
            alt={city.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-5">
            <h3 className="font-serif text-2xl text-cream">{city.name}</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4 text-sm text-cream-muted mb-3">
            <span>{t("properties", { count: city.propertyCount })}</span>
            <span className="w-px h-3 bg-copper/15" />
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {t("developers", { count: developerCount })}
            </span>
          </div>
          <p className="text-cream-muted text-sm leading-relaxed line-clamp-2">
            {localize(city.description, locale)}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-copper text-sm font-medium">
            <span className="group-hover:underline">
              {locale === "ro" ? "Explorează" : locale === "fr" ? "Explorer" : locale === "de" ? "Entdecken" : "Explore"}
            </span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </Link>
  );
}
