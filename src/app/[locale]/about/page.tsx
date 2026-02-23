import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/sections/hero-section";
import { ZigZagShowcase } from "@/components/sections/zigzag-showcase";
import { StatsSection } from "@/components/sections/stats-section";
import { CTABanner } from "@/components/sections/cta-banner";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { teamMembers } from "@/data/team";
import { TeamCard } from "@/components/about/team-card";
import { ValuesSection } from "@/components/about/values-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
};

export default async function AboutPage() {
  const t = await getTranslations("AboutPage");

  const storyItems = [
    {
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
      title: t("story.founding.title"),
      description: t("story.founding.description"),
    },
    {
      image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
      title: t("story.mission.title"),
      description: t("story.mission.description"),
    },
    {
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
      title: t("story.approach.title"),
      description: t("story.approach.description"),
    },
  ];

  return (
    <>
      <HeroSection
        images={["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80"]}
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
      <StatsSection />
      <section className="section-padding bg-background">
        <Container>
          <SectionHeading
            title={t("team.title")}
            subtitle={t("team.subtitle")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <ScrollReveal key={member.id} delay={index * 100}>
                <TeamCard member={member} />
              </ScrollReveal>
            ))}
          </div>
        </Container>
      </section>
      <CTABanner
        title="Work With Us"
        subtitle="Join Romania's leading luxury real estate team."
        buttonText="Get in Touch"
        buttonHref="/contact"
      />
    </>
  );
}
