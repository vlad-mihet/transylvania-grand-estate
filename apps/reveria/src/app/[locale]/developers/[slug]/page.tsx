import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { fetchApi } from "@tge/api-client";
import { mapApiDeveloper, mapApiProperties } from "@tge/api-client";
import { fetchPropertiesByDeveloper } from "@/lib/properties";
import type { ApiDeveloper, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Button } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PropertyGrid } from "@/components/property/property-grid";
import { CTABanner } from "@/components/sections/cta-banner";
import { ExternalLink, MapPin } from "lucide-react";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  try {
    const raw = await fetchApi<ApiDeveloper>(`/developers/${slug}`);
    const dev = mapApiDeveloper(raw);
    return { title: dev.name, description: localize(dev.shortDescription, "en") };
  } catch {
    return {};
  }
}

export default async function DeveloperDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const t = await getTranslations("DeveloperDetailPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const locale = await getLocale() as Locale;

  let dev;
  try {
    const raw = await fetchApi<ApiDeveloper>(`/developers/${slug}`);
    dev = mapApiDeveloper(raw);
  } catch {
    notFound();
  }
  const propertiesRaw = await fetchPropertiesByDeveloper(dev.id, 24);
  const properties = mapApiProperties(propertiesRaw);

  return (
    <>
      <section className="pt-10 md:pt-14 pb-10 md:pb-14 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("developers"), href: "/developers" },
              { label: dev.name },
            ]}
          />
          <div className="mt-6 flex flex-col md:flex-row md:items-start gap-6">
            {dev.logo && (
              <div className="relative h-16 w-40 shrink-0">
                <Image
                  src={dev.logo}
                  alt={dev.name}
                  fill
                  className="object-contain object-left"
                  sizes="160px"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                {dev.name}
              </h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                {dev.city}
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl">
                {localize(dev.description, locale)}
              </p>
              {dev.website && (
                <a
                  href={dev.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4"
                >
                  <Button variant="outline" size="sm">
                    {t("visitWebsite")}
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </Container>
      </section>

      {properties.length > 0 && (
        <section className="pb-16 md:pb-24 bg-background">
          <Container>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {t("projects", { name: dev.name })}
            </h2>
            <PropertyGrid properties={properties} />
          </Container>
        </section>
      )}

      <CTABanner
        title={t("cta.title", { name: dev.name })}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        buttonHref="/contact"
      />
    </>
  );
}
