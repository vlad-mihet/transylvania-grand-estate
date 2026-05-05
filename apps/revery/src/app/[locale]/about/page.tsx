import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@tge/types";
import { Container } from "@/components/layout/container";
import { CTABanner } from "@/components/sections/cta-banner";
import { Badge } from "@tge/ui";
import { Eye, Heart, Users, Headphones, ChevronRight } from "lucide-react";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });
  return createMetadata({
    title: t("hero.title"),
    description: t("hero.description"),
    path: "/about",
    locale,
  });
}

const values = [
  { key: "transparency" as const, icon: Eye },
  { key: "accessibility" as const, icon: Heart },
  { key: "community" as const, icon: Users },
  { key: "support" as const, icon: Headphones },
];

const stats = [
  { key: "cities" },
  { key: "properties" },
  { key: "families" },
  { key: "savings" },
] as const;

const steps = [
  { key: "browse" as const, num: "01" },
  { key: "connect" as const, num: "02" },
  { key: "moveIn" as const, num: "03" },
];

const cities = [
  { key: "clujNapoca" as const, slug: "cluj-napoca", image: "/images/cities/cluj-napoca.jpg" },
  { key: "brasov" as const, slug: "brasov", image: "/images/cities/brasov.jpg" },
  { key: "sibiu" as const, slug: "sibiu", image: "/images/cities/sibiu.jpg" },
  { key: "oradea" as const, slug: "oradea", image: "/images/cities/oradea.jpg" },
  { key: "timisoara" as const, slug: "timisoara", image: "/images/cities/timisoara.jpg" },
];

export default async function AboutPage() {
  const t = await getTranslations("AboutPage");

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[420px] md:min-h-[480px] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <Container className="relative z-10">
          <div className="py-16 md:py-20 lg:py-24">
            {/* Inline breadcrumb for dark background */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm mb-8">
              <Link
                href="/"
                className="text-white/70 hover:text-white transition-colors duration-300"
              >
                Home
              </Link>
              <ChevronRight className="h-3 w-3 text-white/50 flex-shrink-0" />
              <span className="text-white">About</span>
            </nav>

            <div className="max-w-3xl">
              <Badge className="bg-white/15 text-white border-0 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase mb-4 backdrop-blur-sm">
                {t("hero.badge")}
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 [text-shadow:_0_2px_12px_rgba(0,0,0,0.3)]">
                {t("hero.title")}
              </h1>
              <p className="text-white/85 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl">
                {t("hero.description")}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Story */}
      <section className="py-16 md:py-24 bg-background">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-0 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase mb-4"
              >
                {t("story.badge")}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-6">
                {t("story.title")}
              </h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
                <p>{t("story.paragraph1")}</p>
                <p>{t("story.paragraph2")}</p>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg">
                <Image
                  src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"
                  alt={t("story.imageAlt")}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
            </div>
          </div>
        </Container>
      </section>

      {/* Stats */}
      <section className="py-12 md:py-16 bg-muted">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-border">
            {stats.map((stat) => (
              <div key={stat.key} className="text-center px-4">
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 break-words">
                  {t(`stats.${stat.key}.value`)}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t(`stats.${stat.key}.label`)}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-background">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-0 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase mb-4"
            >
              {t("values.badge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("values.title")}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              {t("values.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.key}
                  className="bg-card border border-border rounded-2xl p-8"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <h3 className="text-lg font-bold text-foreground">
                      {t(`values.${value.key}.title`)}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(`values.${value.key}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-muted">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-0 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase mb-4"
            >
              {t("howItWorks.badge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("howItWorks.title")}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              {t("howItWorks.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.key} className="bg-background rounded-2xl p-8">
                <span className="text-3xl font-bold text-border leading-none">
                  {step.num}
                </span>
                <h3 className="text-lg font-bold text-foreground mt-4 mb-2">
                  {t(`howItWorks.steps.${step.key}.title`)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(`howItWorks.steps.${step.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Cities */}
      <section className="py-16 md:py-24 bg-background">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-0 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase mb-4"
            >
              {t("cities.badge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("cities.title")}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              {t("cities.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cities.map((city) => (
              <Link
                key={city.key}
                href={{ pathname: "/properties", query: { city: city.slug } }}
                className="group relative block aspect-[3/4] rounded-2xl overflow-hidden last:col-span-2 md:last:col-span-1"
              >
                <Image
                  src={city.image}
                  alt={t(`cities.items.${city.key}`)}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-bold text-lg">
                    {t(`cities.items.${city.key}`)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <CTABanner
        title={t("cta.title")}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        buttonHref="/properties"
      />
    </>
  );
}
