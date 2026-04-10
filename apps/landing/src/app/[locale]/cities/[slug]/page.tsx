import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { mapApiCity, mapApiProperties } from "@/lib/mappers";
import type { Developer, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { CityHero } from "@/components/city/city-hero";
import { CityStats } from "@/components/city/city-stats";
import { CityDevelopers } from "@/components/city/city-developers";
import { CityProperties } from "@/components/city/city-properties";
import { CTABanner } from "@/components/sections/cta-banner";
import type { Metadata } from "next";

interface CityDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CityDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("CityDetail");
  try {
    const raw = await fetchApi<any>(`/cities/${slug}`);
    const city = mapApiCity(raw);
    return {
      title: t("meta.title", { city: city.name }),
      description: localize(city.description, locale),
    };
  } catch {
    return { title: t("meta.notFound") };
  }
}

export default async function CityDetailPage({ params }: CityDetailPageProps) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const tCity = await getTranslations("CityDetail");
  const tCities = await getTranslations("HomePage.cities");

  let cityRaw, developersRaw, propertiesRaw;
  try {
    [cityRaw, developersRaw, propertiesRaw] = await Promise.all([
      fetchApi<any>(`/cities/${slug}`),
      fetchApi<Developer[]>(`/developers?city=${slug}`),
      fetchApi<any[]>(`/properties?city=${slug}&limit=100`),
    ]);
  } catch {
    notFound();
  }

  const city = mapApiCity(cityRaw);
  const developers = developersRaw;
  const properties = mapApiProperties(propertiesRaw);

  // Compute aggregates
  const priceRange =
    properties.length > 0
      ? {
          min: Math.min(...properties.map((p) => p.price)),
          max: Math.max(...properties.map((p) => p.price)),
        }
      : { min: 0, max: 0 };

  const neighborhoods = [
    ...new Set(properties.map((p) => p.location.neighborhood).filter(Boolean)),
  ];

  const propertyTypes = [
    ...new Set(properties.map((p) => p.type)),
  ];

  return (
    <>
      <CityHero
        city={city}
        locale={locale}
        subtitle={tCities("subtitle")}
      />

      <CityStats
        propertyCount={properties.length}
        developerCount={developers.length}
        priceRange={priceRange}
        neighborhoodCount={neighborhoods.length}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("cities"), href: "/cities" },
              { label: city.name },
            ]}
          />
        }
      />

      <CityDevelopers
        developers={developers}
        cityName={city.name}
        citySlug={city.slug}
      />

      <CityProperties
        properties={properties}
        cityName={city.name}
        citySlug={city.slug}
        propertyTypes={propertyTypes}
      />

      <CTABanner
        title={tCity("cta.title", { city: city.name })}
        subtitle={tCity("cta.subtitle", { city: city.name })}
        buttonText={tCity("cta.button")}
        inquiryContext={{ type: "general" }}
      />
    </>
  );
}
