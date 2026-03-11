"use client";

import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Property } from "@tge/types";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@tge/ui";
import { ScrollReveal } from "@tge/ui";
import { PrestigePropertyCard } from "@/components/property/prestige-property-card";
import { ArrowRight } from "lucide-react";

interface CuratedCollectionProps {
  properties: Property[];
}

export function CuratedCollection({ properties }: CuratedCollectionProps) {
  const t = useTranslations("TransylvaniaPage.collection");
  const displayProperties = properties.slice(0, 3);

  return (
    <section className="section-padding bg-background">
      <Container>
        {/* Left-aligned heading with portfolio link */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <SectionHeading
            title={t("title")}
            subtitle={t("subtitle")}
            alignment="left"
            className="mb-0 md:mb-0"
          />
          <Link
            href="/properties"
            className="text-copper hover:text-copper-light text-sm tracking-wide inline-flex items-center gap-2 transition-colors shrink-0"
          >
            {t("viewPortfolio")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Staggered asymmetric grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          {/* Large card — left */}
          {displayProperties[0] && (
            <ScrollReveal
              direction="up"
              className="md:col-span-6"
            >
              <PrestigePropertyCard
                property={displayProperties[0]}
                aspectRatio="portrait"
              />
            </ScrollReveal>
          )}

          {/* Two stacked cards — right */}
          <div className="md:col-span-6 flex flex-col gap-6 md:gap-8 md:pt-16">
            {displayProperties[1] && (
              <ScrollReveal direction="up" delay={150}>
                <PrestigePropertyCard
                  property={displayProperties[1]}
                  aspectRatio="landscape"
                />
              </ScrollReveal>
            )}
            {displayProperties[2] && (
              <ScrollReveal direction="up" delay={300}>
                <PrestigePropertyCard
                  property={displayProperties[2]}
                  aspectRatio="landscape"
                />
              </ScrollReveal>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
