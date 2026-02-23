"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { AnimatedCounter } from "@/components/shared/animated-counter";

const stats = [
  { end: 150, suffix: "+", key: "propertiesSold" },
  { end: 10, suffix: "+", key: "yearsExperience" },
  { end: 5, suffix: "", key: "citiesServed" },
  { end: 50, suffix: "+", key: "portfolioValue" },
];

export function StatsSection() {
  const t = useTranslations("HomePage.stats");

  return (
    <section className="py-16 md:py-20 bg-background border-y border-copper/10">
      <Container>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.key}>
              <AnimatedCounter
                end={stat.end}
                suffix={stat.suffix}
              />
              <p className="text-cream-muted text-sm mt-2 uppercase tracking-wider">
                {t(stat.key)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
