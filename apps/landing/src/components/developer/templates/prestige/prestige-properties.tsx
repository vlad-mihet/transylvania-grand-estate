"use client";

import type { Developer, Property, Locale } from "@tge/types";
import { SectionHeading, ScrollReveal, AccentButton } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { PropertyGrid } from "@/components/property/property-grid";
import { GalleryPropertyCard } from "@/components/developer/gallery-property-card";
import { Link } from "@tge/i18n/navigation";
import { useTranslations } from "next-intl";

interface PrestigePropertiesProps {
  developer: Developer;
  properties: Property[];
  locale: Locale;
}

export function PrestigeProperties({
  developer,
  properties,
  locale,
}: PrestigePropertiesProps) {
  const t = useTranslations("DeveloperShowcase");

  return (
    <section className="section-padding">
      <Container>
        <SectionHeading
          alignment="left"
          subtitle={t("portfolio")}
          title={t("curatedProperties")}
        />

        {properties.length >= 2 ? (
          <>
            {/* Featured duo: landscape + portrait */}
            <ScrollReveal>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                <div className="lg:col-span-7">
                  <GalleryPropertyCard
                    property={properties[0]}
                    locale={locale}
                    aspectRatio="fill"
                  />
                </div>
                <div className="lg:col-span-5">
                  <GalleryPropertyCard
                    property={properties[1]}
                    locale={locale}
                    aspectRatio="portrait"
                  />
                </div>
              </div>
            </ScrollReveal>

            {/* Remaining properties */}
            {properties.length > 2 && (
              <PropertyGrid properties={properties.slice(2)} />
            )}
          </>
        ) : (
          <PropertyGrid properties={properties} />
        )}

        {/* View all link */}
        <div className="flex justify-center mt-10">
          <AccentButton accentVariant="outline" asChild>
            <Link href="/properties">{t("viewAll")}</Link>
          </AccentButton>
        </div>
      </Container>
    </section>
  );
}
