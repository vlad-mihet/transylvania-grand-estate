import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@tge/i18n/navigation";
import { fetchApi } from "@tge/api-client";
import type { City } from "@tge/types";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ChevronRight } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("CitiesPage");
  return { title: t("hero.title"), description: t("hero.subtitle") };
}

export default async function CitiesPage() {
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
      />

      <section className="pb-16 md:pb-24 bg-background">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/cities/${city.slug}`}
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
