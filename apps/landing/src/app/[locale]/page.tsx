import { getTranslations } from "next-intl/server";
import { fetchApi } from "@tge/api-client";
import { mapApiProperties } from "@tge/api-client";
import type { City, Developer, Testimonial, ApiProperty } from "@tge/types";
import { HomeHeroWithSplash } from "@/components/sections/home-hero-with-splash";
import { FeaturedProperties } from "@/components/sections/featured-properties";
import { ZigZagShowcase } from "@/components/sections/zigzag-showcase";
// import { StatsSection } from "@/components/sections/stats-section";
import { InvestTransylvania } from "@/components/sections/invest-transylvania";
import { CityShowcase } from "@/components/sections/city-showcase";
import { AboutPreview } from "@/components/sections/about-preview";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { DeveloperShowcase } from "@/components/sections/developer-showcase";
import { CTABanner } from "@/components/sections/cta-banner";
import { PartnerLogoTicker } from "@/components/sections/partner-logo-ticker";

export default async function HomePage() {
  const t = await getTranslations("HomePage");

  const [propertiesRaw, cities, developers, testimonials] = await Promise.all([
    fetchApi<ApiProperty[]>("/properties?featured=true&limit=6"),
    fetchApi<City[]>("/cities"),
    fetchApi<Developer[]>("/developers?featured=true"),
    fetchApi<Testimonial[]>("/testimonials"),
  ]);
  const featuredProperties = mapApiProperties(propertiesRaw);

  const showcaseItems = [
    {
      image: "/images/interiors/heritage-hall.jpg",
      title: t("showcase.heritage.title"),
      description: t("showcase.heritage.description"),
    },
    {
      image: "/images/interiors/modern-interior.jpg",
      title: t("showcase.curated.title"),
      description: t("showcase.curated.description"),
    },
    {
      image: "/images/interiors/cozy-living.jpg",
      title: t("showcase.service.title"),
      description: t("showcase.service.description"),
    },
  ];

  return (
    <>
      <HomeHeroWithSplash
        videoSrc="/videos/hero.mp4"
        posterImage="/images/interiors/mansion-exterior.jpg"
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        ctaText={t("hero.cta")}
        ctaHref="/properties"
      />
      <PartnerLogoTicker developers={developers} />
      <FeaturedProperties properties={featuredProperties} centerHeadingInViewport />
      <ZigZagShowcase
        title={t("showcase.title")}
        subtitle={t("showcase.subtitle")}
        items={showcaseItems}
      />
      {/* <StatsSection /> */}
      <InvestTransylvania />
      <CityShowcase cities={cities} />
      <DeveloperShowcase developers={developers} />
      <AboutPreview />
      <TestimonialsSection testimonials={testimonials} />
      <CTABanner
        title={t("cta.title")}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        inquiryContext={{ type: "general" }}
      />
    </>
  );
}
