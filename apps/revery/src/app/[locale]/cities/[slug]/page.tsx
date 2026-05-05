import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { fetchApi } from "@tge/api-client";
import { mapApiProperties } from "@tge/api-client";
import { fetchPropertiesByCity } from "@/lib/properties";
import type { City, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PropertyGrid } from "@/components/property/property-grid";
import { CTABanner } from "@/components/sections/cta-banner";
import { createMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { placeSchema } from "@/lib/jsonld";

interface Params {
  locale: Locale;
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  try {
    const city = await fetchApi<City>(`/cities/${slug}`);
    return createMetadata({
      title: city.name,
      description: localize(city.description, locale),
      path: `/cities/${slug}`,
      locale,
      image: city.image ?? null,
    });
  } catch {
    return {};
  }
}

export default async function CityDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const t = await getTranslations("CityDetailPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const locale = await getLocale() as Locale;

  let city;
  let propertiesRaw;
  try {
    [city, propertiesRaw] = await Promise.all([
      fetchApi<City>(`/cities/${slug}`),
      fetchPropertiesByCity(slug, 24),
    ]);
  } catch {
    notFound();
  }

  const properties = mapApiProperties(propertiesRaw);

  return (
    <>
      <JsonLd schema={placeSchema(city, locale)} />
      <section className="pt-10 md:pt-14 pb-10 md:pb-14 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("cities"), href: "/cities" },
              { label: city.name },
            ]}
            locale={locale}
          />
          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {t("propertiesIn", { city: city.name })}
            </h1>
            <p className="text-muted-foreground text-lg">
              {localize(city.description, locale)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("propertyCount", { count: properties.length })}
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-16 md:pb-24 bg-background">
        <Container>
          <PropertyGrid properties={properties} />
        </Container>
      </section>

      <CTABanner
        title={t("cta.title", { city: city.name })}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        buttonHref="/contact"
      />
    </>
  );
}
