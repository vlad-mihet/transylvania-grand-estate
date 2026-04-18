import { getLocale, getTranslations } from "next-intl/server";
import { fetchApi, fetchApiSafe } from "@tge/api-client";
import { mapApiCity, mapApiProperties, mapApiMapPins, mapApiCounties } from "@tge/api-client";
import {
  fetchProperties,
  fetchPropertiesCount,
  fetchPropertyMapPins,
} from "@/lib/properties";
import type { ApiCity, ApiCounty, Locale } from "@tge/types";
import { PropertyFilterBar } from "@/components/property/property-filter-bar";
import { PropertyListingContent } from "@/components/property/property-listing-content";
import { ContextualHeader } from "@/components/property/contextual-header";

export async function generateMetadata() {
  const t = await getTranslations("PropertiesPage");
  return { title: t("hero.title"), description: t("hero.subtitle") };
}

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
  const fromContext =
    typeof params.from === "string" ? params.from : undefined;
  const isMapView = params.view === "map";

  // Forward the URL filter params to the count endpoint so the initial
  // "Rezultate N" number reflects any filters already applied via the URL
  // (e.g. a shared/bookmarked link). The filter bar takes over on the client
  // via debounced refetches as the user edits filters.
  const filterQs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") filterQs.set(key, value);
    else if (Array.isArray(value)) {
      // Multi-value params like `bedrooms` arrive as string[] from Next.js.
      for (const v of value) filterQs.append(key, v);
    }
  }

  const [
    raw,
    mapPinsRaw,
    countiesRaw,
    contextCityResult,
    initialResultCount,
  ] = await Promise.all([
    fetchProperties({ limit: 100 }),
    fetchPropertyMapPins(),
    fetchApi<ApiCounty[]>("/counties"),
    fromContext === "city" && citySlug
      ? fetchApiSafe<ApiCity>(`/cities/${citySlug}`)
      : Promise.resolve(null),
    fetchPropertiesCount(filterQs),
  ]);

  const properties = mapApiProperties(raw);
  const mapPins = mapApiMapPins(mapPinsRaw);
  const counties = mapApiCounties(countiesRaw);
  const contextCity =
    contextCityResult && contextCityResult.ok
      ? mapApiCity(contextCityResult.data)
      : null;

  return (
    <>
      <ContextualHeader
        city={contextCity}
        locale={locale}
        translations={{
          heroTitle: t("hero.title"),
          heroSubtitle: t("hero.subtitle"),
          breadcrumbHome: tBreadcrumb("home"),
          breadcrumbProperties: tBreadcrumb("properties"),
          breadcrumbCities: tBreadcrumb("cities"),
          breadcrumbDevelopers: tBreadcrumb("cities"),
          contextualCityTitle: contextCity
            ? tCtx("propertiesInCity", { city: contextCity.name })
            : undefined,
          contextualCityLink: contextCity
            ? tCtx("exploreCityDetails", { city: contextCity.name })
            : undefined,
        }}
      />

      {/* Horizontal filter bar — always visible, above both views */}
      <PropertyFilterBar
        counties={counties}
        initialResultCount={initialResultCount}
      />

      {/* Content: map split-view or list grid */}
      <section className={isMapView ? "" : "bg-background"}>
        <PropertyListingContent
          properties={properties}
          mapPins={mapPins}
          {...(!isMapView && {
            cta: {
              title: t("cta.title"),
              subtitle: t("cta.subtitle"),
              buttonText: t("cta.button"),
              buttonHref: "/contact",
            },
          })}
        />
      </section>
    </>
  );
}
