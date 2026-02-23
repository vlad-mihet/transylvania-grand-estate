"use client";

import { useTranslations, useLocale } from "next-intl";
import { testimonials } from "@/data/testimonials";
import { Locale } from "@/types/property";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/shared/section-heading";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Quote, Star } from "lucide-react";

export function TestimonialsSection() {
  const t = useTranslations("HomePage.testimonials");
  const locale = useLocale() as Locale;

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <Carousel
          opts={{ align: "start", loop: true }}
          className="w-full max-w-4xl mx-auto"
        >
          <CarouselContent>
            {testimonials.map((testimonial) => (
              <CarouselItem key={testimonial.id} className="basis-full">
                <div className="frosted-glass p-8 md:p-12 text-center">
                  <Quote className="h-8 w-8 text-copper/40 mx-auto mb-6" />
                  <p className="font-serif text-lg md:text-xl text-cream leading-relaxed italic mb-6">
                    &ldquo;{testimonial.quote[locale]}&rdquo;
                  </p>
                  <div className="flex justify-center gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-copper text-copper"
                      />
                    ))}
                  </div>
                  <p className="text-cream font-medium">
                    {testimonial.clientName}
                  </p>
                  <p className="text-cream-muted text-sm">
                    {testimonial.propertyType} &middot; {testimonial.location}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12 bg-background/80 border-copper/20 text-copper hover:bg-copper/10" />
          <CarouselNext className="hidden md:flex -right-12 bg-background/80 border-copper/20 text-copper hover:bg-copper/10" />
        </Carousel>
      </Container>
    </section>
  );
}
