"use client";

import { useTranslations } from "next-intl";
import { Property } from "@tge/types";
import { PropertyCard } from "@/components/property/property-card";
import { SectionHeading } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { cn } from "@tge/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@tge/ui";

interface FeaturedPropertiesProps {
  properties: Property[];
  centerHeadingInViewport?: boolean;
}

export function FeaturedProperties({
  properties,
  centerHeadingInViewport = false,
}: FeaturedPropertiesProps) {
  const t = useTranslations("HomePage.featured");

  return (
    <section
      className={cn(
        "bg-background",
        centerHeadingInViewport
          ? "pb-16 md:pb-20 lg:pb-24"
          : "section-padding"
      )}
    >
      <Container>
        {centerHeadingInViewport ? (
          <div className="min-h-[20vh] flex flex-col items-center justify-center mb-12 md:mb-16">
            <SectionHeading
              title={t("title")}
              subtitle={t("subtitle")}
              className="mb-0 md:mb-0"
            />
          </div>
        ) : (
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        )}
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
