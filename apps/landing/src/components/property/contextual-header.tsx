import Image from "next/image";
import { Link } from "@tge/i18n/navigation";
import type { City, Developer, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
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
      <section className="relative pt-32 xl:pt-36 pb-10 md:pb-14 bg-background overflow-hidden">
        {/* Subtle city image background */}
        <div className="absolute inset-0 opacity-[0.07]">
          <Image
            src={city.image}
            alt={city.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

        <Container className="relative z-10">
          <Breadcrumb
            items={[
              { label: t.breadcrumbHome, href: "/" },
              { label: t.breadcrumbCities, href: "/cities" },
              { label: city.name, href: `/cities/${city.slug}` },
              { label: t.breadcrumbProperties },
            ]}
          />
          <div className="mt-6">
            <Link
              href={`/cities/${city.slug}`}
              className="inline-flex items-center gap-1.5 text-copper text-sm hover:underline mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.contextualCityLink}
            </Link>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-cream">
              {t.contextualCityTitle}
            </h1>
            <p className="mt-3 text-cream-muted max-w-2xl">
              {localize(city.description, locale)}
            </p>
            <div className="mt-5 h-px w-20 bg-gradient-to-r from-transparent via-copper/60 to-transparent" />
          </div>
        </Container>
      </section>
    );
  }

  if (developer) {
    return (
      <section className="pt-32 xl:pt-36 pb-10 md:pb-14 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: t.breadcrumbHome, href: "/" },
              { label: t.breadcrumbDevelopers, href: "/developers" },
              {
                label: developer.name,
                href: `/developers/${developer.slug}`,
              },
              { label: t.breadcrumbProperties },
            ]}
          />
          <div className="mt-6">
            <Link
              href={`/developers/${developer.slug}`}
              className="inline-flex items-center gap-1.5 text-copper text-sm hover:underline mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.contextualDevLink}
            </Link>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-cream">
              {t.contextualDevTitle}
            </h1>
            <div className="mt-5 h-px w-20 bg-gradient-to-r from-transparent via-copper/60 to-transparent" />
          </div>
        </Container>
      </section>
    );
  }

  // Generic header
  return (
    <section className="pt-32 xl:pt-36 pb-10 md:pb-14 bg-background">
      <Container>
        <Breadcrumb
          items={[
            { label: t.breadcrumbHome, href: "/" },
            { label: t.breadcrumbProperties },
          ]}
        />
        <div className="mt-6 text-center max-w-3xl mx-auto">
          <p className="text-copper uppercase tracking-[0.25em] text-sm font-medium mb-3 animate-fade-in">
            {t.heroSubtitle}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-cream animate-slide-up">
            {t.heroTitle}
          </h1>
          <div className="mt-5 mx-auto h-px w-20 bg-gradient-to-r from-transparent via-copper/60 to-transparent" />
        </div>
      </Container>
    </section>
  );
}
