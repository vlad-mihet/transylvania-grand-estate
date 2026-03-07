import { getLocale, getTranslations } from "next-intl/server";
import { fetchApi } from "@/lib/api";
import { mapApiCity, mapApiDeveloper, mapApiProperties } from "@/lib/mappers";
import type { Locale } from "@tge/types";
import { Container } from "@/components/layout/container";
import { PropertyFilter } from "@/components/property/property-filter";
import { PropertyListingContent } from "./listing-content";
import { ContextualHeader } from "@/components/property/contextual-header";
import { CTABanner } from "@/components/sections/cta-banner";

interface PropertiesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PropertiesPage({
  searchParams,
}: PropertiesPageProps) {
  const params = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("PropertiesPage");
  const tCtx = await getTranslations("PropertiesPage.contextual");
  const tBreadcrumb = await getTranslations("Breadcrumb");

  const citySlug =
    typeof params.city === "string" ? params.city : undefined;
  const developerSlug =
    typeof params.developer === "string" ? params.developer : undefined;
  const fromContext =
    typeof params.from === "string" ? params.from : undefined;

  const [raw, contextCityRaw, contextDeveloperRaw] = await Promise.all([
    fetchApi<any[]>("/properties?limit=100"),
    fromContext === "city" && citySlug
      ? fetchApi<any>(`/cities/${citySlug}`).catch(() => null)
      : Promise.resolve(null),
    fromContext === "developer" && developerSlug
      ? fetchApi<any>(`/developers/${developerSlug}`).catch(() => null)
      : Promise.resolve(null),
  ]);

  const properties = mapApiProperties(raw);
  const contextCity = contextCityRaw ? mapApiCity(contextCityRaw) : null;
  const contextDeveloper = contextDeveloperRaw
    ? mapApiDeveloper(contextDeveloperRaw)
    : null;

  return (
    <>
      <ContextualHeader
        city={contextCity}
        developer={contextDeveloper}
        locale={locale}
        translations={{
          heroTitle: t("hero.title"),
          heroSubtitle: t("hero.subtitle"),
          breadcrumbHome: tBreadcrumb("home"),
          breadcrumbProperties: tBreadcrumb("properties"),
          breadcrumbCities: tBreadcrumb("cities"),
          breadcrumbDevelopers: tBreadcrumb("developers"),
          contextualCityTitle: contextCity
            ? tCtx("propertiesInCity", { city: contextCity.name })
            : undefined,
          contextualDevTitle: contextDeveloper
            ? tCtx("propertiesByDeveloper", {
                developer: contextDeveloper.name,
              })
            : undefined,
          contextualCityLink: contextCity
            ? tCtx("exploreCityDetails", { city: contextCity.name })
            : undefined,
          contextualDevLink: contextDeveloper
            ? tCtx("aboutDeveloper", { developer: contextDeveloper.name })
            : undefined,
        }}
      />

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
        inquiryContext={{ type: "general" }}
      />
    </>
  );
}
