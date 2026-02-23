import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/sections/hero-section";
import { Container } from "@/components/layout/container";
import { ContactForm } from "@/components/contact/contact-form";
import { OfficeLocations } from "@/components/contact/office-locations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
};

export default async function ContactPage() {
  const t = await getTranslations("ContactPage");

  return (
    <>
      <HeroSection
        images={["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80"]}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        height="medium"
      />
      <section className="section-padding bg-background">
        <Container className="max-w-3xl">
          <ContactForm />
        </Container>
      </section>
      <OfficeLocations />
    </>
  );
}
