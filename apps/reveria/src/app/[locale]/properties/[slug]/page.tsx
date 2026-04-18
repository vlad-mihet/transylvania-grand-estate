import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { mapApiProperty, mapApiProperties } from "@tge/api-client";
import {
  fetchPropertiesByCity,
  fetchPropertyBySlug,
  REVERIA_TIER,
} from "@/lib/properties";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertyHeader } from "@/components/property/property-header";
import { PropertyPriceBlock } from "@/components/property/property-price-block";
import { PropertySpecsTable } from "@/components/property/property-specs-table";
import { PropertyBuildingAccordion } from "@/components/property/property-building-accordion";
import { PropertyFacilitiesAccordion } from "@/components/property/property-facilities-accordion";
import { PropertyDescription } from "@/components/property/property-description";
import { PropertyIdReport } from "@/components/property/property-id-report";
import { PropertyDetailMapSection } from "@/components/property/property-detail-map-section";
import { PropertyLoanCard } from "@/components/property/property-loan-card";
import { PropertyContactCard } from "@/components/property/property-contact-card";
import { SimilarProperties } from "@/components/property/similar-properties";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  try {
    const raw = await fetchPropertyBySlug(slug);
    if (raw.tier && raw.tier !== REVERIA_TIER) {
      return {};
    }
    const property = mapApiProperty(raw);
    const loc = locale as Locale;
    return {
      title: localize(property.title, loc),
      description: localize(property.shortDescription, loc),
    };
  } catch {
    return {};
  }
}

interface PropertyAgent {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photo?: string;
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("PropertyDetail");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const tCommon = await getTranslations("Common.propertyTypes");

  let property;
  let agent: PropertyAgent | null = null;
  try {
    const raw = await fetchPropertyBySlug(slug);
    // Slug lookups ignore tier on the API side, so we 404 luxury properties
    // here to keep them from leaking into the Reveria frontend via direct URL.
    if (raw.tier && raw.tier !== REVERIA_TIER) {
      notFound();
    }
    property = mapApiProperty(raw);
    if (raw.agent && raw.agent.email && raw.agent.phone) {
      agent = {
        firstName: raw.agent.firstName,
        lastName: raw.agent.lastName,
        phone: raw.agent.phone,
        email: raw.agent.email,
        photo: raw.agent.photo ?? undefined,
      };
    }
  } catch {
    notFound();
  }

  const similarRaw = await fetchPropertiesByCity(
    property.location.citySlug,
    5,
  );
  const similar = mapApiProperties(similarRaw)
    .filter((p) => p.slug !== slug)
    .slice(0, 4);

  const title = localize(property.title, locale);
  const description = localize(property.description, locale);
  const address = localize(property.location.address, locale);

  const defaultInlineMessage = t("inlineInquiry.defaultMessage", {
    title,
  });

  return (
    <>
      <section className="pt-8 md:pt-10 pb-6 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("properties"), href: "/properties" },
              { label: title },
            ]}
          />
          <div className="mt-6">
            <PropertyHeader title={title} slug={slug} />
          </div>
          <div className="mt-6">
            <PropertyGallery images={property.images} />
          </div>
        </Container>
      </section>

      <section className="pb-12 bg-background">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
            <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
              <PropertyPriceBlock
                title={title}
                price={property.price}
                pricePerSqm={property.pricePerSqm}
                locale={locale}
                city={property.location.city}
                citySlug={property.location.citySlug}
                neighborhood={property.location.neighborhood}
              />

              <PropertySpecsTable property={property} locale={locale} />

              <PropertyBuildingAccordion property={property} />
              <PropertyFacilitiesAccordion property={property} />

              <PropertyDescription description={description} />

              <PropertyIdReport
                id={property.id}
                title={title}
                slug={property.slug}
              />

              <PropertyDetailMapSection
                lat={property.location.coordinates.lat}
                lng={property.location.coordinates.lng}
                address={address}
              />

              <PropertyLoanCard price={property.price} />
            </div>

            <aside className="lg:col-span-1 order-1 lg:order-2">
              <div className="lg:sticky lg:top-24">
                <PropertyContactCard
                  agent={agent}
                  propertyTitle={title}
                  propertySlug={property.slug}
                  defaultMessage={defaultInlineMessage}
                />
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <SimilarProperties properties={similar} />

      <section className="pb-10 bg-background">
        <Container>
          <Breadcrumb
            variant="footer"
            items={[
              { label: tBreadcrumb("properties"), href: "/properties" },
              { label: tCommon(property.type), href: `/properties?type=${property.type}` },
              {
                label: property.location.city,
                href: `/cities/${property.location.citySlug}`,
              },
              { label: property.location.neighborhood },
              { label: title },
            ]}
          />
        </Container>
      </section>
    </>
  );
}
