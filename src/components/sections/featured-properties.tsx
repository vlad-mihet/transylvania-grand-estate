"use client";

import { useTranslations } from "next-intl";
import { Property } from "@/types/property";
import { PropertyCard } from "@/components/property/property-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { Container } from "@/components/layout/container";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface FeaturedPropertiesProps {
  properties: Property[];
}

export function FeaturedProperties({ properties }: FeaturedPropertiesProps) {
  const t = useTranslations("HomePage.featured");

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {properties.map((property) => (
              <CarouselItem
                key={property.id}
                className="pl-4 basis-full md:basis-1/2 lg:basis-1/3"
              >
                <PropertyCard property={property} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4 bg-background/80 backdrop-blur-sm border-copper/15 text-cream/50 hover:text-copper hover:border-copper/40" />
          <CarouselNext className="hidden md:flex -right-4 bg-background/80 backdrop-blur-sm border-copper/15 text-cream/50 hover:text-copper hover:border-copper/40" />
        </Carousel>
      </Container>
    </section>
  );
}
