import { getTranslations } from "next-intl/server";
import { fetchApiSafe } from "@tge/api-client";
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

  // Fetch both the curated homepage list and the brand-scoped listing, then
  // union them so the /cities page leads with the curated order (matching the
  // hero rail) and tails into the rest of the brand's tagged cities. Both
  // endpoints already filter by `city_brands`, so the union stays inside the
  // brand's visibility — featured ⊂ all-tagged. Dedupe preserves first
  // occurrence so curated order wins for the overlap.
  // Guard SSR fetches: an API hiccup should degrade to an empty-state page,
  // not a 500. Mirrors the homepage's fetchApiSafe fallback (BUG-201).
  const [featuredRes, defaultRes, developersRes] = await Promise.all([
    fetchApiSafe<ApiCity[]>("/cities?featured=true"),
    fetchApiSafe<ApiCity[]>("/cities"),
    fetchApiSafe<Developer[]>("/developers"),
  ]);
  const featuredRaw = featuredRes.ok ? featuredRes.data : [];
  const defaultRaw = defaultRes.ok ? defaultRes.data : [];
  const developers = developersRes.ok ? developersRes.data : [];
  const seen = new Set<string>();
  const cities = [...featuredRaw, ...defaultRaw]
    .filter((c) => (seen.has(c.slug) ? false : (seen.add(c.slug), true)))
    .map(mapApiCity);

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
