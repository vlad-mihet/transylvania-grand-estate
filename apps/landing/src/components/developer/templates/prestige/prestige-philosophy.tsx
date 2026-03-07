"use client";

import Image from "next/image";
import type { Developer, Property, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { ScrollReveal, AccentButton } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

interface PrestigePhilosophyProps {
  developer: Developer;
  properties: Property[];
  locale: Locale;
}

export function PrestigePhilosophy({
  developer,
  properties,
  locale,
}: PrestigePhilosophyProps) {
  const t = useTranslations("DeveloperShowcase");

  // Use second property's hero image, or coverImage, or first property's first image as fallback
  const secondPropertyHero = properties[1]?.images.find((img) => img.isHero) ??
    properties[1]?.images[0];
  const imageSrc =
    secondPropertyHero?.src ??
    developer.coverImage ??
    properties[0]?.images[0]?.src;

  const imageAlt = secondPropertyHero
    ? localize(secondPropertyHero.alt, locale)
    : developer.name;

  // Use tagline if available, otherwise use the first two sentences of the description
  const visionText = developer.tagline
    ? localize(developer.tagline, locale)
    : (() => {
        const desc = localize(developer.description, locale);
        const sentences = desc.match(/[^.!?]+[.!?]+/g);
        return sentences ? sentences.slice(0, 2).join(" ").trim() : desc;
      })();

  return (
    <section className="bg-[#101014] section-padding">
      <Container>
        <ScrollReveal>
          <div className="relative aspect-[4/3] md:aspect-[21/9] rounded-2xl overflow-hidden">
            {/* Background image */}
            {imageSrc && (
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 1280px"
              />
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Floating frosted card */}
            <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-auto md:max-w-lg frosted-glass-overlay p-8 md:p-10">
              <h3 className="font-serif text-2xl md:text-3xl text-cream mb-4">
                {t("ourVision")}
              </h3>

              <div className="w-12 h-0.5 bg-copper mb-6" />

              <p className="text-cream-muted leading-relaxed mb-6">
                {visionText}
              </p>

              {developer.website && (
                <AccentButton accentVariant="outline" asChild>
                  <a
                    href={developer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    {t("visitWebsite")}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </AccentButton>
              )}
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
