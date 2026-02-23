import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import {
  properties,
  getPropertyBySlug,
  getSimilarProperties,
} from "@/data/properties";
import { Locale } from "@/types/property";
import { formatPrice, formatArea } from "@/lib/format";
import { Container } from "@/components/layout/container";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertySpecs } from "@/components/property/property-specs";
import { PropertyFeatures } from "@/components/property/property-features";
import { SimilarProperties } from "@/components/property/similar-properties";
import { CTABanner } from "@/components/sections/cta-banner";
import { AccentButton } from "@/components/shared/accent-button";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";

export function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const property = getPropertyBySlug(slug);
  if (!property) return {};
  const loc = locale as Locale;
  return {
    title: property.title[loc],
    description: property.shortDescription[loc],
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("PropertyDetail");
  const similar = getSimilarProperties(property);

  return (
    <>
      <section className="pt-24 pb-8 bg-background">
        <Container>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 text-cream-muted hover:text-copper transition-colors text-sm mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToProperties")}
          </Link>
          <PropertyGallery images={property.images} />
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
                {property.title[locale]}
              </h1>
              <div className="flex items-center gap-1 text-cream-muted mb-6">
                <MapPin className="h-4 w-4 text-copper" />
                <span>
                  {property.location.neighborhood},{" "}
                  {property.location.city}
                </span>
              </div>

              <PropertySpecs
                specs={property.specs}
                variant="full"
                className="mb-8"
              />

              <Separator className="bg-copper/10 mb-8" />

              <h2 className="font-serif text-2xl text-cream mb-4">
                {t("description")}
              </h2>
              <div className="text-cream-muted leading-relaxed space-y-4">
                {property.description[locale]
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
                </div>

                <div className="space-y-3">
                  <AccentButton className="w-full" asChild>
                    <Link href="/contact">{t("requestInfo")}</Link>
                  </AccentButton>
                  <AccentButton
                    accentVariant="outline"
                    className="w-full"
                    asChild
                  >
                    <Link href="/contact">{t("scheduleViewing")}</Link>
                  </AccentButton>
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
        buttonHref="/contact"
      />
    </>
  );
}
