import { Link } from "@/i18n/navigation";
import type { City, Developer, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft } from "lucide-react";

interface ContextualHeaderProps {
  city?: City | null;
  developer?: Developer | null;
  locale: Locale;
  translations: {
    heroTitle: string;
    heroSubtitle: string;
    breadcrumbHome: string;
    breadcrumbProperties: string;
    breadcrumbCities: string;
    breadcrumbDevelopers: string;
    contextualCityTitle?: string;
    contextualDevTitle?: string;
    contextualCityLink?: string;
    contextualDevLink?: string;
  };
}

export function ContextualHeader({
  city,
  developer,
  locale,
  translations: t,
}: ContextualHeaderProps) {
  if (city) {
    return (
      <section className="pt-10 md:pt-14 pb-10 md:pb-14 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: t.breadcrumbHome, href: "/" },
              { label: t.breadcrumbCities, href: "/cities" },
              {
                label: city.name,
                href: { pathname: "/cities/[slug]", params: { slug: city.slug } },
              },
              { label: t.breadcrumbProperties },
            ]}
          />
          <div className="mt-6">
            <Link
              href={{ pathname: "/cities/[slug]", params: { slug: city.slug } }}
              className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.contextualCityLink}
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
              {t.contextualCityTitle}
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              {localize(city.description, locale)}
            </p>
          </div>
        </Container>
      </section>
    );
  }

  if (developer) {
    return (
      <section className="pt-10 md:pt-14 pb-10 md:pb-14 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: t.breadcrumbHome, href: "/" },
              { label: t.breadcrumbDevelopers, href: "/developers" },
              {
                label: developer.name,
                href: { pathname: "/developers/[slug]", params: { slug: developer.slug } },
              },
              { label: t.breadcrumbProperties },
            ]}
          />
          <div className="mt-6">
            <Link
              href={{ pathname: "/developers/[slug]", params: { slug: developer.slug } }}
              className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.contextualDevLink}
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
              {t.contextualDevTitle}
            </h1>
          </div>
        </Container>
      </section>
    );
  }

  // Generic header
  return (
    <PageHeader
      title={t.heroTitle}
      subtitle={t.heroSubtitle}
      breadcrumbItems={[
        { label: t.breadcrumbHome, href: "/" },
        { label: t.breadcrumbProperties },
      ]}
    />
  );
}
