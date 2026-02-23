import { getTranslations } from "next-intl/server";
import { properties } from "@/data/properties";
import { Container } from "@/components/layout/container";
import { PropertyFilter } from "@/components/property/property-filter";
import { PropertyListingContent } from "./listing-content";
import { CTABanner } from "@/components/sections/cta-banner";

export default async function PropertiesPage() {
  const t = await getTranslations("PropertiesPage");

  return (
    <>
      {/* Compact page header */}
      <section className="pt-32 xl:pt-36 pb-10 md:pb-14 bg-background">
        <Container>
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-copper uppercase tracking-[0.25em] text-sm font-medium mb-3 animate-fade-in">
              {t("hero.subtitle")}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-cream animate-slide-up">
              {t("hero.title")}
            </h1>
            <div className="mt-5 mx-auto h-px w-20 bg-gradient-to-r from-transparent via-copper/60 to-transparent" />
          </div>
        </Container>
      </section>

      {/* Listings section: sidebar + content */}
      <section className="pb-16 md:pb-20 lg:pb-24 bg-background">
        <Container>
          <div className="lg:flex lg:gap-10 xl:gap-12">
            <PropertyFilter />
            <div className="flex-1 min-w-0">
              <PropertyListingContent properties={properties} />
            </div>
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
