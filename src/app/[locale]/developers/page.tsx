import { getTranslations } from "next-intl/server";
import { developers } from "@/data/developers";
import { HeroSection } from "@/components/sections/hero-section";
import { Container } from "@/components/layout/container";
import { DeveloperCard } from "@/components/developer/developer-card";
import { CTABanner } from "@/components/sections/cta-banner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developers",
};

export default async function DevelopersPage() {
  const t = await getTranslations("DevelopersPage");

  return (
    <>
      <HeroSection
        images={["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80"]}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        height="medium"
      />
      <section className="section-padding bg-background">
        <Container>
          <p className="text-cream-muted text-lg leading-relaxed max-w-3xl mx-auto text-center mb-12">
            {t("description")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {developers.map((developer) => (
              <DeveloperCard key={developer.id} developer={developer} />
            ))}
          </div>
        </Container>
      </section>
      <CTABanner
        title={t("cta.title")}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        buttonHref="/contact"
      />
    </>
  );
}
