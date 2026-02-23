"use client";

import { useTranslations } from "next-intl";
import { Property } from "@/types/property";
import { PropertyCard } from "./property-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { Container } from "@/components/layout/container";

interface SimilarPropertiesProps {
  properties: Property[];
}

export function SimilarProperties({ properties }: SimilarPropertiesProps) {
  const t = useTranslations("PropertyDetail.similarProperties");

  if (properties.length === 0) return null;

  return (
    <section className="section-padding bg-[#0f0a04]">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </Container>
    </section>
  );
}
