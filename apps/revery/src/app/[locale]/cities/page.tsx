import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchApi } from "@tge/api-client";
import type { City, Locale } from "@tge/types";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ChevronRight } from "lucide-react";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CitiesPage" });
  return createMetadata({
    title: t("hero.title"),
    description: t("hero.subtitle"),
    path: "/cities",
    locale,
  });
}

export default async function CitiesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("CitiesPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const cities = await fetchApi<City[]>("/cities");

  return (
    <>
      <PageHeader
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        breadcrumbItems={[
          { label: tBreadcrumb("home"), href: "/" },
          { label: tBreadcrumb("cities") },
        ]}
        locale={locale}
      />

      <section className="pb-16 md:pb-24 bg-background">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={{ pathname: "/cities/[slug]", params: { slug: city.slug } }}
                className="group"
              >
                <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={city.image}
                      alt={city.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      {city.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("propertyCount", { count: city.propertyCount })}
                    </p>
                    <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:underline">
                      {t("viewProperties")}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
