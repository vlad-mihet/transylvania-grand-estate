"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { AnimatedCounter } from "@tge/ui";
import { formatPrice } from "@tge/utils";

interface CityStatsProps {
  propertyCount: number;
  developerCount: number;
  priceRange: { min: number; max: number };
  neighborhoodCount: number;
  breadcrumb?: React.ReactNode;
}

export function CityStats({
  propertyCount,
  developerCount,
  priceRange,
  neighborhoodCount,
  breadcrumb,
}: CityStatsProps) {
  const t = useTranslations("CityDetail.stats");

  const priceLabel =
    priceRange.min > 0 && priceRange.max > 0
      ? `${formatPrice(priceRange.min)} – ${formatPrice(priceRange.max)}`
      : "—";

  return (
    <section className="py-12 md:py-16 bg-background border-y border-copper/10">
      <Container>
        {breadcrumb && <div className="mb-8">{breadcrumb}</div>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div>
            <AnimatedCounter end={propertyCount} />
            <p className="text-cream-muted text-sm mt-2 uppercase tracking-wider">
              {t("properties")}
            </p>
          </div>
          <div>
            <AnimatedCounter end={developerCount} />
            <p className="text-cream-muted text-sm mt-2 uppercase tracking-wider">
              {t("developers")}
            </p>
          </div>
          <div>
            <p className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl text-copper break-words">
              {priceLabel}
            </p>
            <p className="text-cream-muted text-sm mt-2 uppercase tracking-wider">
              {t("priceRange")}
            </p>
          </div>
          <div>
            <AnimatedCounter end={neighborhoodCount} />
            <p className="text-cream-muted text-sm mt-2 uppercase tracking-wider">
              {t("neighborhoods")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
