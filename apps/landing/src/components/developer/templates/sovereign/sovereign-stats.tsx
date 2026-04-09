"use client";

import type { Developer, Locale } from "@tge/types";
import { ScrollReveal, AnimatedCounter } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { Building2, Calendar, Home, MapPin, Award, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface SovereignStatsProps {
  developer: Developer;
  locale: Locale;
}

interface StatItem {
  icon: LucideIcon;
  end: number;
  suffix: string;
  labelKey: string;
}

const statsConfig: Record<string, StatItem[]> = {
  "carpathia-imobiliare": [
    { icon: Building2, end: 12, suffix: "+", labelKey: "projectsDelivered" },
    { icon: Calendar, end: 15, suffix: "+", labelKey: "yearsActive" },
    { icon: Home, end: 3000, suffix: "+", labelKey: "homesBuilt" },
    { icon: MapPin, end: 3, suffix: "", labelKey: "cities" },
  ],
  "gran-via": [
    { icon: Building2, end: 8, suffix: "+", labelKey: "projectsDelivered" },
    { icon: Calendar, end: 10, suffix: "+", labelKey: "yearsActive" },
    { icon: Home, end: 1200, suffix: "+", labelKey: "homesBuilt" },
    { icon: Award, end: 5, suffix: "", labelKey: "awardsWon" },
  ],
  "nova-building": [
    { icon: Building2, end: 6, suffix: "+", labelKey: "projectsDelivered" },
    { icon: Calendar, end: 8, suffix: "+", labelKey: "yearsActive" },
    { icon: Home, end: 800, suffix: "+", labelKey: "homesBuilt" },
    { icon: Users, end: 750, suffix: "+", labelKey: "happyClients" },
  ],
};

function getDefaultStats(projectCount: number): StatItem[] {
  return [
    { icon: Building2, end: projectCount, suffix: "+", labelKey: "projectsDelivered" },
    { icon: Calendar, end: 10, suffix: "+", labelKey: "yearsActive" },
    { icon: Home, end: projectCount * 150, suffix: "+", labelKey: "homesBuilt" },
    { icon: MapPin, end: 2, suffix: "", labelKey: "cities" },
  ];
}

export function SovereignStats({ developer, locale }: SovereignStatsProps) {
  const t = useTranslations("DeveloperShowcase");
  const stats = statsConfig[developer.slug] ?? getDefaultStats(developer.projectCount);

  return (
    <section className="bg-[#101014] py-16 md:py-20">
      <Container>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <ScrollReveal key={stat.labelKey} delay={index * 100}>
                <div className="frosted-glass-refined p-6 md:p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-copper/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="text-copper h-5 w-5" />
                  </div>
                  <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                  <p className="text-cream-muted text-sm mt-2 uppercase tracking-wider">
                    {t(stat.labelKey)}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
