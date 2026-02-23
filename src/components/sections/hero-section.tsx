"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AccentButton } from "@/components/shared/accent-button";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

interface HeroSectionProps {
  images: string[];
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  height?: "large" | "medium" | "small";
}

export function HeroSection({
  images,
  title,
  subtitle,
  ctaText,
  ctaHref,
  height = "large",
}: HeroSectionProps) {
  const heightClasses = {
    large: "h-[70vh]",
    medium: "h-[55vh]",
    small: "h-[40vh]",
  };

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
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

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  return (
    <section className={cn("relative overflow-hidden", heightClasses[height])}>
      <div className="absolute inset-0" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((image, index) => (
            <div key={index} className="relative flex-[0_0_100%] min-w-0 h-full">
              <Image
                src={image}
                alt=""
                fill
                className="object-cover"
                priority={index === 0}
                sizes="100vw"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-black/50 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-[1]" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        {subtitle && (
          <p className="text-copper uppercase tracking-[0.25em] text-sm md:text-base mb-4 animate-fade-in">
            {subtitle}
          </p>
        )}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-cream max-w-4xl leading-tight animate-slide-up">
          {title}
        </h1>
        {ctaText && ctaHref && (
          <div className="mt-8 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <AccentButton size="lg" asChild>
              <Link href={ctaHref}>{ctaText}</Link>
            </AccentButton>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                selectedIndex === index
                  ? "bg-copper w-6 shadow-[0_0_8px_rgba(196,127,90,0.4)]"
                  : "bg-cream/25 hover:bg-cream/40"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
