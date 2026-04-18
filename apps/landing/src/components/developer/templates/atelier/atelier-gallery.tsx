"use client";

import { useState, useEffect } from "react";
import type { Property, Locale } from "@tge/types";
import {
  SectionHeading,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@tge/ui";
import { Container } from "@/components/layout/container";
import { GalleryPropertyCard } from "@/components/developer/gallery-property-card";
import { useTranslations } from "next-intl";

interface AtelierGalleryProps {
  properties: Property[];
  locale: Locale;
}

export function AtelierGallery({ properties, locale }: AtelierGalleryProps) {
  const t = useTranslations("DeveloperShowcase");
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!api) return;
    const snap = () => {
      setCurrent(api.selectedScrollSnap() + 1);
      setTotal(api.scrollSnapList().length);
    };
    api.on("init", snap);
    api.on("select", snap);
    api.on("reInit", snap);
    // Deferred initial sync — avoids calling setState synchronously inside
    // the effect body (React 19 lint rule); microtask still flushes before
    // paint so the first visible state is correct.
    queueMicrotask(snap);

    return () => {
      api.off("init", snap);
      api.off("select", snap);
      api.off("reInit", snap);
    };
  }, [api]);

  if (properties.length === 0) return null;

  return (
    <section className="bg-[#101014] section-padding">
      <Container>
        <SectionHeading
          subtitle={t("selectedProjects")}
          title={t("gallery")}
          alignment="left"
        />
      </Container>

      <Carousel
        opts={{ align: "start", loop: true }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="-ml-6">
          {properties.map((property) => (
            <CarouselItem
              key={property.id}
              className="pl-6 basis-[85%] sm:basis-[70%] md:basis-[55%] lg:basis-[42%] first:ml-[var(--container-inset)]"
            >
              <GalleryPropertyCard property={property} locale={locale} />
            </CarouselItem>
          ))}
        </CarouselContent>

        <Container>
          <div className="flex items-center justify-end gap-4 mt-8">
            <CarouselPrevious className="static translate-y-0 translate-x-0 bg-background/80 backdrop-blur-sm border-copper/15 text-cream/50 hover:text-copper hover:border-copper/40" />
            <CarouselNext className="static translate-y-0 translate-x-0 bg-background/80 backdrop-blur-sm border-copper/15 text-cream/50 hover:text-copper hover:border-copper/40" />
            <span className="text-cream-muted text-sm ml-4">
              {current} / {total}
            </span>
          </div>
        </Container>
      </Carousel>
    </section>
  );
}
