"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { AnimatedCounter } from "@tge/ui";
import { cn } from "@tge/utils";

const stats = [
  { end: 150, suffix: "+", key: "propertiesSold" },
  { end: 10, suffix: "+", key: "yearsExperience" },
  { end: 5, suffix: "", key: "citiesServed" },
  { end: 50, suffix: "+", key: "portfolioValue" },
];

export function PrestigeStats() {
  const t = useTranslations("TransylvaniaPage.stats");

  return (
    <section className="py-12 md:py-16 bg-[#101014]">
      <div className="divider-fade" />
      <Container>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-12 md:py-16">
          {stats.map((stat, index) => (
            <div
              key={stat.key}
              className={cn(
                "text-center relative",
                index < stats.length - 1 &&
                  "lg:after:absolute lg:after:right-0 lg:after:top-1/2 lg:after:-translate-y-1/2 lg:after:h-12 lg:after:w-px lg:after:bg-copper/10"
              )}
            >
              <AnimatedCounter end={stat.end} suffix={stat.suffix} />
              <p className="text-cream-muted text-xs uppercase tracking-[0.25em] mt-3">
                {t(stat.key)}
              </p>
            </div>
          ))}
        </div>
      </Container>
      <div className="divider-fade" />
    </section>
  );
}
