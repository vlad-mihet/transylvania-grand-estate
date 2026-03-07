"use client";

import Image from "next/image";
import type { Developer, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { ScrollReveal, AccentButton } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

interface SovereignAboutProps {
  developer: Developer;
  locale: Locale;
}

export function SovereignAbout({ developer, locale }: SovereignAboutProps) {
  const t = useTranslations("DeveloperShowcase");
  const fullDescription = localize(developer.description, locale);

  const paragraphs = fullDescription
    .split(/\n\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <section className="bg-background section-padding">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <ScrollReveal direction="left">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src={developer.logo}
                alt={`${developer.name} — about`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent" />
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={200}>
            <div>
              <div className="w-16 h-0.5 bg-copper mb-6" />

              <h2 className="font-serif text-2xl md:text-3xl text-cream mb-6">
                {t("aboutDeveloper", { name: developer.name })}
              </h2>

              <div className="text-cream-muted text-lg leading-relaxed space-y-4 mb-8">
                {paragraphs.length > 1 ? (
                  paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))
                ) : (
                  <p>{fullDescription}</p>
                )}
              </div>

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
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
