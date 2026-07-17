import { getTranslations } from "next-intl/server";
import { fetchApiSafe } from "@tge/api-client";
import { mapApiCity } from "@tge/api-client";
import type { Developer, City, ApiCity } from "@tge/types";
import { HeroSection } from "@/components/sections/hero-section";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { DeveloperListing } from "@/components/developer/developer-listing";
import { CTABanner } from "@/components/sections/cta-banner";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DevelopersPage");
  return {
    title: t("hero.title"),
  };
}

export default async function DevelopersPage() {
  const t = await getTranslations("DevelopersPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");

  // Guard SSR fetches so an API hiccup degrades to an empty page, not 500 (BUG-201).
  const [developersRes, citiesRes] = await Promise.all([
    fetchApiSafe<Developer[]>("/developers"),
    fetchApiSafe<ApiCity[]>("/cities"),
  ]);
  const developers = developersRes.ok ? developersRes.data : [];
  const cities: City[] = (citiesRes.ok ? citiesRes.data : []).map(mapApiCity);

  return (
    <>
      <HeroSection
        images={["/images/towns/city-buildings.jpg"]}
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
                { label: tBreadcrumb("developers") },
              ]}
            />
          </div>
          <p className="text-cream-muted text-lg leading-relaxed max-w-3xl mx-auto text-center mb-12">
            {t("description")}
          </p>
          <DeveloperListing developers={developers} cities={cities} />
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
