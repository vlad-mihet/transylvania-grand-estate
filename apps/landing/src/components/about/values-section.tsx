"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@tge/ui";
import { ScrollReveal } from "@tge/ui";
import { Award, ShieldCheck, Landmark, Lightbulb } from "lucide-react";

const values = [
  { key: "excellence", icon: Award },
  { key: "discretion", icon: ShieldCheck },
  { key: "heritage", icon: Landmark },
  { key: "innovation", icon: Lightbulb },
];

export function ValuesSection() {
  const t = useTranslations("AboutPage.values");

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <ScrollReveal key={value.key} delay={index * 100}>
                <div className="frosted-glass p-6 text-center h-full">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-copper/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-copper" />
                  </div>
                  <h3 className="font-serif text-lg text-cream mb-2">
                    {t(`${value.key}.title`)}
                  </h3>
                  <p className="text-cream-muted text-sm leading-relaxed">
                    {t(`${value.key}.description`)}
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
