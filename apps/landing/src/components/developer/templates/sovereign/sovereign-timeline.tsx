"use client";

import type { Developer, Locale } from "@tge/types";
import { SectionHeading, ScrollReveal } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { useTranslations } from "next-intl";

interface SovereignTimelineProps {
  developer: Developer;
  locale: Locale;
}

interface Milestone {
  year: string;
  title: string;
  description: string;
}

const knownDevelopers = ["carpathia-imobiliare", "gran-via", "nova-building"];

export function SovereignTimeline({
  developer,
}: SovereignTimelineProps) {
  const t = useTranslations("DeveloperShowcase");
  const milestoneKey = knownDevelopers.includes(developer.slug)
    ? developer.slug
    : "default";
  const rawMilestones = t.raw(`milestonesData.${milestoneKey}`) as Milestone[];
  const milestones =
    milestoneKey === "default"
      ? rawMilestones.map((m) => ({
          ...m,
          description: m.description
            .replace("{name}", developer.name)
            .replace("{city}", developer.city),
        }))
      : rawMilestones;

  return (
    <section className="bg-background section-padding">
      <Container>
        <SectionHeading
          alignment="center"
          subtitle={t("ourJourney")}
          title={t("milestones")}
        />

        <div className="relative">
          {/* Center timeline line */}
          <div className="absolute left-4 lg:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-copper/25 to-transparent" />

          <div className="space-y-12 lg:space-y-16">
            {milestones.map((milestone, index) => {
              const isEven = index % 2 === 0;

              return (
                <ScrollReveal key={milestone.year} delay={index * 120}>
                  <div className="relative">
                    {/* Mobile layout */}
                    <div className="lg:hidden pl-14 relative">
                      {/* Year dot - mobile */}
                      <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-copper text-background flex items-center justify-center text-xs font-bold z-10 shadow-[0_0_16px_rgba(196,127,90,0.2)]">
                        {milestone.year.slice(-2)}
                      </div>
                      <div className="frosted-glass-refined p-6">
                        <span className="text-copper font-serif text-lg">
                          {milestone.year}
                        </span>
                        <h3 className="font-serif text-xl text-cream mt-1 mb-2">
                          {milestone.title}
                        </h3>
                        <p className="text-cream-muted text-sm leading-relaxed">
                          {milestone.description}
                        </p>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div
                      className={`hidden lg:flex items-start gap-8 ${
                        isEven ? "flex-row" : "flex-row-reverse"
                      }`}
                    >
                      {/* Content card */}
                      <div className="lg:w-[45%]">
                        <div className="frosted-glass-refined p-6">
                          <span className="text-copper font-serif text-lg">
                            {milestone.year}
                          </span>
                          <h3 className="font-serif text-xl text-cream mt-1 mb-2">
                            {milestone.title}
                          </h3>
                          <p className="text-cream-muted text-sm leading-relaxed">
                            {milestone.description}
                          </p>
                        </div>
                      </div>

                      {/* Year dot - desktop */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-copper text-background flex items-center justify-center text-xs font-bold z-10 shadow-[0_0_16px_rgba(196,127,90,0.2)]">
                        {milestone.year.slice(-2)}
                      </div>

                      {/* Empty spacer */}
                      <div className="lg:w-[45%]" />
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
