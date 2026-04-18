import { getTranslations } from "next-intl/server";
import { fetchApi } from "@tge/api-client";
import type { Developer, ApiCity } from "@tge/types";
import { mapApiCity } from "@tge/api-client";
import { HeroSection } from "@/components/sections/hero-section";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { CityCard } from "@/components/city/city-card";
import { CTABanner } from "@/components/sections/cta-banner";
import { ScrollReveal } from "@tge/ui";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CitiesPage");
  return {
    title: t("hero.title"),
    description: t("description"),
  };
}

export default async function CitiesPage() {
  const t = await getTranslations("CitiesPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");

  const [citiesRaw, developers] = await Promise.all([
    fetchApi<ApiCity[]>("/cities"),
    fetchApi<Developer[]>("/developers"),
  ]);
  const cities = citiesRaw.map(mapApiCity);

  // Compute developer count per city
  const developerCountByCity = developers.reduce(
    (acc, dev) => {
      const slug = dev.citySlug;
      acc[slug] = (acc[slug] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <>
      <HeroSection
        images={[
          "/images/nature/mountain-valley.jpg",
        ]}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        height="medium"
      />

      <section className="section-padding bg-background">
        <Container>
          <div className="mb-8">
            <Breadcrumb
              items={[
                { label: tBreadcrumb("home"), href: "/" },
                { label: tBreadcrumb("cities") },
              ]}
            />
          </div>

          <p className="text-cream-muted text-lg leading-relaxed max-w-3xl mx-auto text-center mb-12">
            {t("description")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cities.map((city, index) => (
              <ScrollReveal key={city.slug} delay={index * 100}>
                <CityCard
                  city={city}
                  developerCount={developerCountByCity[city.slug] || 0}
                />
              </ScrollReveal>
            ))}
          </div>
        </Container>
      </section>

      <CTABanner
        title={t("cta.title")}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        inquiryContext={{ type: "general" }}
      />
    </>
  );
}
