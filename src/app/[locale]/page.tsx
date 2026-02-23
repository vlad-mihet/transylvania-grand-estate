import { getTranslations } from "next-intl/server";
import { getFeaturedProperties } from "@/data/properties";
import { HeroSection } from "@/components/sections/hero-section";
import { FeaturedProperties } from "@/components/sections/featured-properties";
import { ZigZagShowcase } from "@/components/sections/zigzag-showcase";
import { StatsSection } from "@/components/sections/stats-section";
import { CityShowcase } from "@/components/sections/city-showcase";
import { AboutPreview } from "@/components/sections/about-preview";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { DeveloperShowcase } from "@/components/sections/developer-showcase";
import { CTABanner } from "@/components/sections/cta-banner";

export default async function HomePage() {
  const t = await getTranslations("HomePage");
  const featuredProperties = getFeaturedProperties();

  const showcaseItems = [
    {
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
      title: t("showcase.heritage.title"),
      description: t("showcase.heritage.description"),
    },
    {
      image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
      title: t("showcase.curated.title"),
      description: t("showcase.curated.description"),
    },
    {
      image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80",
      title: t("showcase.service.title"),
      description: t("showcase.service.description"),
    },
  ];

  return (
    <>
      <HeroSection
        images={[
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80",
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80",
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80",
          "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=80",
        ]}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        ctaText={t("hero.cta")}
        ctaHref="/properties"
      />
      <FeaturedProperties properties={featuredProperties} />
      <ZigZagShowcase
        title={t("showcase.title")}
        subtitle={t("showcase.subtitle")}
        items={showcaseItems}
      />
      <StatsSection />
      <CityShowcase />
      <DeveloperShowcase />
      <AboutPreview />
      <TestimonialsSection />
      <CTABanner
        title={t("cta.title")}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        buttonHref="/contact"
      />
    </>
  );
}
