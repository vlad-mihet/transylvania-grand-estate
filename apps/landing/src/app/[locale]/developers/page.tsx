import { getTranslations } from "next-intl/server";
import { fetchApi } from "@tge/api-client";
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

  const [developers, citiesRaw] = await Promise.all([
    fetchApi<Developer[]>("/developers"),
    fetchApi<ApiCity[]>("/cities"),
  ]);
  const cities: City[] = citiesRaw.map(mapApiCity);

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
