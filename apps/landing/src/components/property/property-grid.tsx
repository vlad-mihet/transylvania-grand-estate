"use client";

import { Property } from "@tge/types";
import { PropertyCard } from "./property-card";
import { ScrollReveal } from "@tge/ui";
import { cn } from "@tge/utils";

interface PropertyGridProps {
  properties: Property[];
  className?: string;
}

export function PropertyGrid({ properties, className }: PropertyGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7",
        className
      )}
    >
      {properties.map((property, index) => (
        <ScrollReveal key={property.id} delay={index * 100}>
          <PropertyCard property={property} />
        </ScrollReveal>
      ))}
    </div>
  );
}
