"use client";

import { useTranslations } from "next-intl";
import { Property } from "@tge/types";
import { PropertyCard } from "./property-card";
import { Container } from "@/components/layout/container";

interface SimilarPropertiesProps {
  properties: Property[];
}

export function SimilarProperties({ properties }: SimilarPropertiesProps) {
  const t = useTranslations("PropertyDetail.similarProperties");

  if (properties.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-background">
      <Container>
        <h2 className="text-2xl font-bold text-foreground mb-6">{t("title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </Container>
    </section>
  );
}
