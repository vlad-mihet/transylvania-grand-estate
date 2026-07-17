import { getLocale, getTranslations } from "next-intl/server";
import { fetchApiSafe } from "@tge/api-client";
import { mapApiProperties, mapApiArticles, mapApiCounties } from "@tge/api-client";
import { fetchPropertiesSafe } from "@/lib/properties";
import type {
  ApiArticle,
  ApiCounty,
  City,
  Locale,
} from "@tge/types";
import { HeroSection } from "@/components/sections/hero-section";
import { ValueProposition } from "@/components/sections/value-proposition";
import { FeaturedProperties } from "@/components/sections/featured-properties";
import { UsefulTools } from "@/components/sections/useful-tools";
import { CityShowcase } from "@/components/sections/city-showcase";
import { RecentArticles } from "@/components/sections/recent-articles";
import { FAQSection } from "@/components/sections/faq-section";
import { CTABanner } from "@/components/sections/cta-banner";
import { createMetadata } from "@/lib/seo";

interface PageParams { locale: Locale }

export async function generateMetadata({ params }: { params: Promise<PageParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage.hero" });
  return createMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/",
    locale,
  });
}

export default async function HomePage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("HomePage");

  // Every homepage section is decorative — a transient API error must degrade
  // the section to empty, never 500 the whole page. All four fetches use the
  // non-throwing `*Safe` variants and fall back to [].
  const [propertiesResult, citiesResult, countiesResult, articlesResult] =
    await Promise.all([
      fetchPropertiesSafe({ limit: 8, sort: "newest" }, locale),
      fetchApiSafe<City[]>("/cities?featured=true"),
      fetchApiSafe<ApiCounty[]>("/counties"),
      fetchApiSafe<ApiArticle[]>(
        "/articles?status=published&limit=6&sort=newest",
      ),
    ]);

  const featuredProperties = mapApiProperties(
    propertiesResult.ok ? propertiesResult.data : [],
  );
  const cities = citiesResult.ok ? citiesResult.data : [];
  const counties = mapApiCounties(
    countiesResult.ok ? countiesResult.data : [],
  );
  const recentArticles = mapApiArticles(
    articlesResult.ok ? articlesResult.data : [],
  );

  return (
    <>
      <HeroSection counties={counties} />
      <ValueProposition />
      <FeaturedProperties properties={featuredProperties} />
      <UsefulTools />
      <CityShowcase cities={cities} />
      <RecentArticles articles={recentArticles} />
      <FAQSection />
      <CTABanner
        title={t("cta.title")}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        buttonHref="/contact"
      />
    </>
  );
}
