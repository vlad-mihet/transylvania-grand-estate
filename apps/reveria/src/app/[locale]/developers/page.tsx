import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@tge/i18n/navigation";
import { fetchApi } from "@tge/api-client";
import { mapApiDeveloper } from "@tge/api-client";
import type { ApiDeveloper, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ChevronRight, MapPin } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("DevelopersPage");
  return { title: t("hero.title"), description: t("hero.subtitle") };
}

export default async function DevelopersPage() {
  const t = await getTranslations("DevelopersPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const locale = await getLocale() as Locale;
  const developersRaw = await fetchApi<ApiDeveloper[]>("/developers");
  const developers = developersRaw.map(mapApiDeveloper);

  return (
    <>
      <PageHeader
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        breadcrumbItems={[
          { label: tBreadcrumb("home"), href: "/" },
          { label: tBreadcrumb("developers") },
        ]}
      />

      <section className="pb-16 md:pb-24 bg-background">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {developers.map((dev) => (
              <Link
                key={dev.slug}
                href={`/developers/${dev.slug}`}
                className="group"
              >
                <div className="bg-card rounded-xl border border-border p-6 h-full hover:shadow-lg hover:border-primary/20 transition-all">
                  {dev.logo && (
                    <div className="relative h-12 w-32 mb-4">
                      <Image
                        src={dev.logo}
                        alt={dev.name}
                        fill
                        className="object-contain object-left"
                        sizes="128px"
                      />
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    {dev.name}
                  </h2>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="h-3.5 w-3.5" />
                    {dev.city}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {localize(dev.shortDescription, locale)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t("projectCount", { count: dev.projectCount })}
                    </span>
                    <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:underline">
                      {t("viewProjects")}
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
