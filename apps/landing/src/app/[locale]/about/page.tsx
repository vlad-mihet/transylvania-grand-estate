import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/sections/hero-section";
import { ZigZagShowcase } from "@/components/sections/zigzag-showcase";

import { CTABanner } from "@/components/sections/cta-banner";
import { ValuesSection } from "@/components/about/values-section";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AboutPage");
  return {
    title: t("hero.title"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("AboutPage");

  const storyItems = [
    {
      image: "/images/interiors/estate-heritage.jpg",
      title: t("story.founding.title"),
      description: t("story.founding.description"),
    },
    {
      image: "/images/interiors/modern-interior.jpg",
      title: t("story.mission.title"),
      description: t("story.mission.description"),
    },
    {
      image: "/images/interiors/villa-exterior.jpg",
      title: t("story.approach.title"),
      description: t("story.approach.description"),
    },
  ];

  return (
    <>
      <HeroSection
        images={["/images/interiors/mansion-exterior.jpg"]}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        height="medium"
      />
      <ZigZagShowcase
        title={t("hero.title")}
        subtitle=""
        items={storyItems}
      />
      <ValuesSection />

      <CTABanner
        title={t("cta.title")}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        inquiryContext={{ type: "general" }}
      />
    </>
  );
}
