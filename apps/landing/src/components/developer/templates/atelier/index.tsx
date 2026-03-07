import type { Developer, Property, Locale } from "@tge/types";
import { AtelierHero } from "./atelier-hero";
import { AtelierGallery } from "./atelier-gallery";
import { AtelierListing } from "./atelier-listing";
import { AtelierProfile } from "./atelier-profile";
import { CTABanner } from "@/components/sections/cta-banner";
import { getTranslations } from "next-intl/server";

interface AtelierTemplateProps {
  developer: Developer;
  properties: Property[];
  locale: Locale;
}

export async function AtelierTemplate({
  developer,
  properties,
  locale,
}: AtelierTemplateProps) {
  const t = await getTranslations("DeveloperShowcase");

  return (
    <>
      <AtelierHero
        developer={developer}
        properties={properties}
        locale={locale}
      />

      <AtelierGallery
        properties={properties}
        locale={locale}
      />

      <AtelierListing
        properties={properties}
        locale={locale}
      />

      <AtelierProfile
        developer={developer}
        locale={locale}
      />

      <CTABanner
        title={t("interested")}
        subtitle={t("interestedSubtitle")}
        buttonText={t("getInTouch")}
        inquiryContext={{
          type: "developer",
          entityName: developer.name,
          entitySlug: developer.slug,
        }}
      />
    </>
  );
}
