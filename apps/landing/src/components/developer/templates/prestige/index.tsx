import type { Developer, Property, Locale } from "@tge/types";
import { PrestigeHero } from "./prestige-hero";
import { PrestigeIntro } from "./prestige-intro";
import { PrestigeProperties } from "./prestige-properties";
import { PrestigePhilosophy } from "./prestige-philosophy";
import { CTABanner } from "@/components/sections/cta-banner";
import { getTranslations } from "next-intl/server";

interface PrestigeTemplateProps {
  developer: Developer;
  properties: Property[];
  locale: Locale;
}

export async function PrestigeTemplate({
  developer,
  properties,
  locale,
}: PrestigeTemplateProps) {
  const t = await getTranslations("DeveloperShowcase");

  return (
    <>
      <PrestigeHero
        developer={developer}
        properties={properties}
        locale={locale}
      />

      <PrestigeIntro developer={developer} locale={locale} />

      <PrestigeProperties
        developer={developer}
        properties={properties}
        locale={locale}
      />

      <PrestigePhilosophy
        developer={developer}
        properties={properties}
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
