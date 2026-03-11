"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";
import { AccentButton } from "@tge/ui";
import { Link } from "@tge/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowLeft, ArrowRight } from "lucide-react";

const slides = [
  {
    key: "nature",
    image:
      "/images/nature/river-mountains.jpg",
  },
  {
    key: "heritage",
    image:
      "/images/castles/bran-castle.jpg",
  },
  {
    key: "market",
    image:
      "/images/towns/city-buildings.jpg",
  },
  {
    key: "lifestyle",
    image:
      "/images/interiors/villa-pool.jpg",
  },
];

export function InvestTransylvania() {
  const t = useTranslations("HomePage.investTransylvania");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 6000, stopOnInteraction: true }),
  ]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  return (
    <section className="relative">
      {/* Full-bleed carousel */}
      <div className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <div className="absolute inset-0" ref={emblaRef}>
          <div className="flex h-full">
            {slides.map((slide) => (
              <div
                key={slide.key}
                className="relative flex-[0_0_100%] min-w-0 h-full"
              >
                <Image
                  src={slide.image}
                  alt={t(`slides.${slide.key}.title`)}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 bg-black/55 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101014] via-transparent to-[#101014]/60 z-[1]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <p className="text-copper uppercase tracking-[0.25em] text-sm mb-4 animate-fade-in">
            {t("subtitle")}
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-cream max-w-3xl leading-tight mb-6">
            {t("title")}
          </h2>
          <div className="h-px w-16 bg-copper mx-auto mb-8" />

          {/* Slide content that transitions */}
          <div className="max-w-2xl mx-auto min-h-[120px] flex flex-col items-center justify-center">
            {slides.map((slide, index) => (
              <div
                key={slide.key}
                className={cn(
                  "absolute transition-all duration-500 max-w-2xl px-4",
                  selectedIndex === index
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none"
                )}
              >
                <h3 className="font-serif text-xl md:text-2xl text-cream mb-3">
                  {t(`slides.${slide.key}.title`)}
                </h3>
                <p className="text-cream-muted leading-relaxed text-base md:text-lg">
                  {t(`slides.${slide.key}.description`)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-20">
            <AccentButton size="lg" asChild>
              <Link href="/transylvania">
                {t("cta")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </AccentButton>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={scrollPrev}
          className="absolute top-1/2 -translate-y-1/2 left-4 md:left-8 z-10 w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm border border-cream/10 flex items-center justify-center text-cream/70 hover:text-cream hover:bg-copper/20 hover:border-copper/30 transition-all cursor-pointer"
          aria-label="Previous slide"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={scrollNext}
          className="absolute top-1/2 -translate-y-1/2 right-4 md:right-8 z-10 w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm border border-cream/10 flex items-center justify-center text-cream/70 hover:text-cream hover:bg-copper/20 hover:border-copper/30 transition-all cursor-pointer"
          aria-label="Next slide"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
                selectedIndex === index
                  ? "bg-copper w-6 shadow-[0_0_8px_rgba(196,127,90,0.4)]"
                  : "bg-cream/25 hover:bg-cream/40"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
