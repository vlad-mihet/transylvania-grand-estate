"use client";

import Image from "next/image";
import type { Developer, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { ScrollReveal, Separator } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { MapPin, ExternalLink, Quote } from "lucide-react";
import { useTranslations } from "next-intl";

interface AtelierProfileProps {
  developer: Developer;
  locale: Locale;
}

export function AtelierProfile({ developer, locale }: AtelierProfileProps) {
  const t = useTranslations("DeveloperShowcase");

  const fullDescription = localize(developer.description, locale);
  const paragraphs = fullDescription.split("\n").filter((p) => p.trim());
  const firstParagraph = paragraphs[0] ?? "";
  const remainingParagraphs = paragraphs.slice(1);

  const tagline = developer.tagline
    ? localize(developer.tagline, locale)
    : null;
  const shortDesc = localize(developer.shortDescription, locale);

  return (
    <section className="bg-[#101014] section-padding">
      <Container className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
        {/* Left sidebar */}
        <div className="lg:col-span-2">
          <ScrollReveal direction="left">
            <div className="lg:sticky lg:top-28">
              {developer.logo && (
                <div className="relative aspect-square max-w-[180px] rounded-2xl overflow-hidden mb-6 ring-1 ring-copper/10">
                  <Image
                    src={developer.logo}
                    alt={`${developer.name} logo`}
                    fill
                    className="object-contain"
                  />
                </div>
              )}

              <h3 className="font-serif text-2xl text-cream mb-3">
                {developer.name}
              </h3>

              <p className="flex items-center gap-2 text-cream-muted text-sm mb-2">
                <MapPin className="h-4 w-4 text-copper/60" />
                {developer.city}
              </p>

              {developer.website && (
                <a
                  href={developer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-copper text-sm mb-6 hover:text-copper-light transition-colors duration-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  {developer.website.replace(/^https?:\/\//, "")}
                </a>
              )}

              {!developer.website && <div className="mb-6" />}

              <Separator className="bg-copper/10 mb-6" />

              <div>
                <span className="text-copper font-serif text-3xl">
                  {developer.projectCount}
                </span>
                <p className="text-cream-muted text-sm uppercase tracking-wider mt-1">
                  {t("projectsLabel")}
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Right content */}
        <div className="lg:col-span-3">
          <ScrollReveal direction="right" delay={200}>
            <p className="font-serif text-xl md:text-2xl text-cream leading-snug mb-8">
              {firstParagraph}
            </p>

            {remainingParagraphs.length > 0 && (
              <div className="text-cream-muted text-lg leading-relaxed space-y-4 mb-8">
                {remainingParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}

            <div className="frosted-glass-refined p-6 md:p-8">
              {tagline ? (
                <>
                  <Quote className="text-copper/40 h-6 w-6 mb-3" />
                  <p className="font-serif text-lg text-cream italic">
                    {tagline}
                  </p>
                </>
              ) : (
                <>
                  <Quote className="text-copper/40 h-6 w-6 mb-3" />
                  <p className="font-serif text-lg text-cream italic">
                    {shortDesc}
                  </p>
                </>
              )}
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
