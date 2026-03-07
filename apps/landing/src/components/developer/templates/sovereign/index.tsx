import type { Developer, Property, Locale } from "@tge/types";
import { SovereignHero } from "./sovereign-hero";
import { SovereignStats } from "./sovereign-stats";
import { SovereignTimeline } from "./sovereign-timeline";
import { SovereignProperties } from "./sovereign-properties";
import { SovereignAbout } from "./sovereign-about";
import { CTABanner } from "@/components/sections/cta-banner";
import { getTranslations } from "next-intl/server";

interface SovereignTemplateProps {
  developer: Developer;
  properties: Property[];
  locale: Locale;
}

export async function SovereignTemplate({
  developer,
  properties,
  locale,
}: SovereignTemplateProps) {
  const t = await getTranslations("DeveloperShowcase");

  return (
    <>
      <SovereignHero
        developer={developer}
        properties={properties}
        locale={locale}
      />

      <SovereignStats developer={developer} locale={locale} />

      <SovereignTimeline developer={developer} locale={locale} />

      <SovereignProperties
        developer={developer}
        properties={properties}
        locale={locale}
      />

      <SovereignAbout developer={developer} locale={locale} />

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
