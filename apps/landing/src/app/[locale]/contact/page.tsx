import { getTranslations } from "next-intl/server";
import { fetchApi } from "@/lib/api";
import { mapApiProperties } from "@/lib/mappers";
import { HeroSection } from "@/components/sections/hero-section";
import { Container } from "@/components/layout/container";
import { ContactForm } from "@/components/contact/contact-form";
import { OfficeLocations } from "@/components/contact/office-locations";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ContactPage");
  return {
    title: t("hero.title"),
  };
}

export default async function ContactPage() {
  const t = await getTranslations("ContactPage");
  const raw = await fetchApi<any[]>("/properties?limit=100");
  const properties = mapApiProperties(raw);

  return (
    <>
      <HeroSection
        images={["/images/interiors/modern-interior.jpg"]}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
      />
      <section className="relative z-10 -mt-28 pb-16 md:pb-20 lg:pb-24">
        <Container className="max-w-3xl">
          <ContactForm properties={properties.map(p => ({ id: p.id, slug: p.slug, title: { en: p.title.en } }))} />
        </Container>
      </section>
      <OfficeLocations />
    </>
  );
}
