"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Testimonial, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Container } from "@/components/layout/container";
import { ScrollReveal } from "@tge/ui";

interface TestimonialSingleProps {
  testimonials: Testimonial[];
}

export function TestimonialSingle({ testimonials }: TestimonialSingleProps) {
  const t = useTranslations("TransylvaniaPage.testimonials");
  const locale = useLocale() as Locale;
  const [activeIndex, setActiveIndex] = useState(0);

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const interval = setInterval(advance, 8000);
    return () => clearInterval(interval);
  }, [advance]);

  if (testimonials.length === 0) return null;

  return (
    <section className="section-padding bg-background">
      <Container>
        <ScrollReveal>
          <div className="relative max-w-4xl mx-auto min-h-[40vh] flex flex-col items-center justify-center text-center px-4">
            {/* Decorative quote */}
            <div className="decorative-quote">&ldquo;</div>

            {/* Label */}
            <p className="text-copper uppercase tracking-[0.25em] text-sm font-medium mb-12 relative z-10">
              {t("label")}
            </p>

            {/* Testimonial crossfade */}
            <div className="grid w-full">
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className="col-start-1 row-start-1 flex flex-col items-center justify-center text-center transition-all duration-700 ease-out"
                  style={{
                    opacity: activeIndex === index ? 1 : 0,
                    transform:
                      activeIndex === index
                        ? "translateY(0)"
                        : "translateY(10px)",
                    pointerEvents: activeIndex === index ? "auto" : "none",
                  }}
                >
                  <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-cream leading-relaxed italic mb-8">
                    &ldquo;{localize(testimonial.quote, locale)}&rdquo;
                  </p>
                  <div className="h-px w-12 bg-copper mb-6" />
                  <p className="text-copper text-sm uppercase tracking-[0.2em]">
                    {testimonial.clientName}
                  </p>
                  <p className="text-cream-muted/50 text-xs mt-2">
                    {testimonial.propertyType} &middot; {testimonial.location}
                  </p>
                </div>
              ))}
            </div>

            {/* Progress indicators */}
            {testimonials.length > 1 && (
              <div className="flex gap-2 mt-12 relative z-10">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className="h-px w-8 transition-all duration-500 cursor-pointer"
                    style={{
                      backgroundColor:
                        activeIndex === index
                          ? "var(--color-copper)"
                          : "rgba(240, 237, 232, 0.15)",
                    }}
                    aria-label={`Testimonial ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
