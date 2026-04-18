import { getLocale, getTranslations } from "next-intl/server";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { fetchApi, fetchApiSafe } from "@tge/api-client";
import { mapApiCity, mapApiDeveloper, mapApiProperties } from "@tge/api-client";
import type { Locale, ApiCity, ApiDeveloper, ApiProperty } from "@tge/types";
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

  // Fetch the properties list eagerly; context lookups are optional breadcrumb
  // breadcrumb hints — a missing city or developer shouldn't crash the page,
  // so fetchApiSafe swallows per-request errors while we still surface the
  // primary listing failure if `/properties` is down.
  const [raw, contextCityResult, contextDeveloperResult] = await Promise.all([
    fetchApi<ApiProperty[]>("/properties?limit=100"),
    fromContext === "city" && citySlug
      ? fetchApiSafe<ApiCity>(`/cities/${citySlug}`)
      : Promise.resolve({ ok: false as const, error: null }),
    fromContext === "developer" && developerSlug
      ? fetchApiSafe<ApiDeveloper>(`/developers/${developerSlug}`)
      : Promise.resolve({ ok: false as const, error: null }),
  ]);
  const contextCityRaw = contextCityResult.ok ? contextCityResult.data : null;
  const contextDeveloperRaw = contextDeveloperResult.ok
    ? contextDeveloperResult.data
    : null;

  const properties = mapApiProperties(raw);
  const contextCity = contextCityRaw ? mapApiCity(contextCityRaw) : null;
  const contextDeveloper = contextDeveloperRaw
    ? mapApiDeveloper(contextDeveloperRaw)
    : null;

  // Prime the React Query cache so client components that later call
  // `useProperties({ limit: 100 })` hit the SSR payload instead of refetching.
  // The queryKey matches `packages/hooks/src/queries/use-properties.ts`.
  const queryClient = new QueryClient();
  queryClient.setQueryData(["properties", { limit: 100 }], raw);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
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
    </HydrationBoundary>
  );
}
