"use client";

import type { Developer, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { ScrollReveal } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

interface PrestigeIntroProps {
  developer: Developer;
  locale: Locale;
}

export function PrestigeIntro({ developer, locale }: PrestigeIntroProps) {
  const t = useTranslations("DeveloperShowcase");
  const fullDescription = localize(developer.description, locale);

  // Extract the first sentence for the pull-quote
  const sentenceMatch = fullDescription.match(/^[^.!?]+[.!?]/);
  const pullQuote = sentenceMatch ? sentenceMatch[0] : fullDescription;

  return (
    <section className="pt-24 md:pt-32 lg:pt-40 pb-16 md:pb-20 lg:pb-24">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          {/* Left column - Pull-quote */}
          <div className="lg:col-span-5">
            <ScrollReveal direction="left">
              <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl text-cream leading-snug border-l-2 border-copper pl-8">
                {pullQuote}
              </blockquote>
            </ScrollReveal>
          </div>

          {/* Right column - Description & stats */}
          <div className="lg:col-span-7">
            <ScrollReveal direction="right" delay={200}>
              <p className="text-cream-muted text-lg leading-relaxed">
                {fullDescription}
              </p>

              <div className="divider-fade my-8" />

              <div className="flex items-center gap-10">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-2xl text-copper">
                    {developer.projectCount}
                  </span>
                  <span className="text-cream-muted text-sm uppercase tracking-wider">
                    {t("projectsLabel")}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-cream-muted">
                  <MapPin className="h-4 w-4 text-copper/60" />
                  <span className="text-sm">{developer.city}</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
