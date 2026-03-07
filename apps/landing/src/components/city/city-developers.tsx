"use client";

import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import type { Developer } from "@tge/types";
import { Container } from "@/components/layout/container";
import { DeveloperCard } from "@/components/developer/developer-card";
import { SectionHeading, AccentButton, ScrollReveal } from "@tge/ui";

interface CityDevelopersProps {
  developers: Developer[];
  cityName: string;
  citySlug: string;
}

export function CityDevelopers({
  developers,
  cityName,
  citySlug,
}: CityDevelopersProps) {
  const t = useTranslations("CityDetail.developers");

  if (developers.length === 0) return null;

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading
          title={t("title", { city: cityName })}
          subtitle={t("subtitle")}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {developers.map((developer, index) => (
            <ScrollReveal key={developer.id} delay={index * 100}>
              <DeveloperCard developer={developer} />
            </ScrollReveal>
          ))}
        </div>
        {developers.length > 3 && (
          <div className="mt-10 text-center">
            <AccentButton accentVariant="outline" asChild>
              <Link href={`/developers?city=${citySlug}`}>
                {t("viewAll")}
              </Link>
            </AccentButton>
          </div>
        )}
      </Container>
    </section>
  );
}
