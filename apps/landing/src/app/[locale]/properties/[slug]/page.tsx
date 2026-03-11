import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { Locale } from "@tge/types";
import { formatPrice, formatArea, localize } from "@tge/utils";
import { fetchApi } from "@/lib/api";
import { mapApiProperty, mapApiProperties } from "@/lib/mappers";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertySpecs } from "@/components/property/property-specs";
import { PropertyFeatures } from "@/components/property/property-features";
import { SimilarProperties } from "@/components/property/similar-properties";
import { CTABanner } from "@/components/sections/cta-banner";
import { AccentButton } from "@tge/ui";
import { Link } from "@tge/i18n/navigation";
import { InquiryTrigger } from "@/components/inquiry";
import { Badge } from "@tge/ui";
import { Separator } from "@tge/ui";
import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  try {
    const raw = await fetchApi<any>(`/properties/${slug}`);
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

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let property;
  try {
    const raw = await fetchApi<any>(`/properties/${slug}`);
    property = mapApiProperty(raw);
  } catch {
    notFound();
  }

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("PropertyDetail");
  const tBreadcrumb = await getTranslations("Breadcrumb");

  const similarRaw = await fetchApi<any[]>(
    `/properties?city=${property.location.citySlug}&limit=4`
  );
  const similar = mapApiProperties(similarRaw)
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  return (
    <>
      <section className="pt-32 xl:pt-36 pb-8 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("properties"), href: "/properties" },
              { label: localize(property.title, locale) },
            ]}
          />
          <div className="mt-4">
            <PropertyGallery images={property.images} />
          </div>
        </Container>
      </section>

      <section className="pb-16 bg-background">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className="bg-copper/90 text-background">
                  {property.type.charAt(0).toUpperCase() +
                    property.type.slice(1)}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    property.status === "available"
                      ? "border-copper text-copper"
                      : property.status === "reserved"
                        ? "border-copper-light text-copper-light"
                        : "border-cream-muted/50 text-cream-muted"
                  }
                >
                  {t(`status.${property.status}`)}
                </Badge>
              </div>

              <h1 className="font-serif text-3xl md:text-4xl text-cream mb-2">
                {localize(property.title, locale)}
              </h1>
              <div className="flex items-center gap-1 text-cream-muted mb-6">
                <MapPin className="h-4 w-4 text-copper" />
                <span>
                  {property.location.neighborhood},{" "}
                  <Link
                    href={`/cities/${property.location.citySlug}`}
                    className="hover:text-copper transition-colors"
                  >
                    {property.location.city}
                  </Link>
                </span>
              </div>

              <PropertySpecs
                specs={property.specs}
                propertyType={property.type}
                variant="full"
                className="mb-8"
              />

              <Separator className="bg-copper/10 mb-8" />

              <h2 className="font-serif text-2xl text-cream mb-4">
                {t("description")}
              </h2>
              <div className="text-cream-muted leading-relaxed space-y-4">
                {localize(property.description, locale)
                  .split("\n\n")
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
              </div>

              <Separator className="bg-copper/10 my-8" />

              <h2 className="font-serif text-2xl text-cream mb-6">
                {t("features")}
              </h2>
              <PropertyFeatures features={property.features} />
            </div>

            <div className="lg:col-span-1">
              <div className="frosted-glass p-6 sticky top-24">
                <p className="text-cream-muted text-sm mb-1">{t("price")}</p>
                <p className="font-serif text-3xl text-copper mb-6">
                  {formatPrice(property.price, locale)}
                </p>

                <div className="space-y-3 mb-6">
                  {property.type === "terrain" ? (
                    <>
                      {property.specs.landArea && (
                        <div className="flex justify-between text-sm">
                          <span className="text-cream-muted">
                            {t("specs.landArea")}
                          </span>
                          <span className="text-cream">
                            {formatArea(property.specs.landArea, locale)}
                          </span>
                        </div>
                      )}
                      {property.specs.area > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-cream-muted">
                            {t("specs.area")}
                          </span>
                          <span className="text-cream">
                            {formatArea(property.specs.area, locale)}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-cream-muted">
                          {t("specs.area")}
                        </span>
                        <span className="text-cream">
                          {formatArea(property.specs.area, locale)}
                        </span>
                      </div>
                      {property.specs.landArea && (
                        <div className="flex justify-between text-sm">
                          <span className="text-cream-muted">
                            {t("specs.landArea")}
                          </span>
                          <span className="text-cream">
                            {formatArea(property.specs.landArea, locale)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-cream-muted">
                          {t("specs.bedrooms")}
                        </span>
                        <span className="text-cream">
                          {property.specs.bedrooms}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-cream-muted">
                          {t("specs.bathrooms")}
                        </span>
                        <span className="text-cream">
                          {property.specs.bathrooms}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <InquiryTrigger
                    context={{
                      type: "property",
                      entityName: localize(property.title, locale),
                      entitySlug: property.slug,
                    }}
                  >
                    <AccentButton className="w-full">
                      {t("requestInfo")}
                    </AccentButton>
                  </InquiryTrigger>
                  <InquiryTrigger
                    context={{
                      type: "property",
                      entityName: localize(property.title, locale),
                      entitySlug: property.slug,
                    }}
                  >
                    <AccentButton accentVariant="outline" className="w-full">
                      {t("scheduleViewing")}
                    </AccentButton>
                  </InquiryTrigger>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <SimilarProperties properties={similar} />
      <CTABanner
        title="Interested in This Property?"
        subtitle="Contact us for a private viewing or more information."
        buttonText={t("requestInfo")}
        inquiryContext={{
          type: "property",
          entityName: localize(property.title, locale),
          entitySlug: property.slug,
        }}
      />
    </>
  );
}
