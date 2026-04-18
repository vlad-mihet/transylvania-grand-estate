import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchApiSafe } from "@tge/api-client";
import { mapApiArticles } from "@tge/api-client";
import type { ApiArticle, Locale } from "@tge/types";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ArticleCard } from "@/components/blog/article-card";
import {
  Calculator,
  Receipt,
  TrendingUp,
  Wallet,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ToolsPage" });
  return createMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/instrumente",
    locale,
  });
}

const tools = [
  {
    key: "mortgage" as const,
    href: "/instrumente/calculator-ipotecar" as const,
    icon: Calculator,
    color: "bg-primary/10 text-primary",
  },
  {
    key: "purchaseCost" as const,
    href: "/instrumente/costuri-achizitie" as const,
    icon: Receipt,
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    key: "rentalYield" as const,
    href: "/instrumente/randament-inchiriere" as const,
    icon: TrendingUp,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    key: "borrowingCapacity" as const,
    href: "/instrumente/capacitate-imprumut" as const,
    icon: Wallet,
    color: "bg-blue-500/10 text-blue-600",
  },
];

export default async function InstrumentePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("ToolsPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");

  const articlesResult = await fetchApiSafe<ApiArticle[]>(
    "/articles?status=published&limit=3&sort=newest",
  );
  const articles = articlesResult.ok ? mapApiArticles(articlesResult.data) : [];

  return (
    <>
      {/* Hero */}
      <section className="pt-10 md:pt-14 pb-10 md:pb-14 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("tools") },
            ]}
            locale={locale}
          />
          <div className="mt-6 text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
              {t("hero.title")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("hero.subtitle")}
            </p>
          </div>
        </Container>
      </section>

      {/* Tools Grid */}
      <section className="pb-16 md:pb-20 bg-background">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tools.map((tool) => (
              <Link
                key={tool.key}
                href={tool.href}
                className="group block"
              >
                <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all h-full">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tool.color}`}
                    >
                      <tool.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-foreground mb-2">
                        {t(`tools.${tool.key}.title`)}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {t(`tools.${tool.key}.description`)}
                      </p>
                      <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:underline">
                        {t(`tools.${tool.key}.cta`)}
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Guides & Articles */}
      {articles.length > 0 && (
        <section className="pb-16 md:pb-24 bg-background border-t border-border pt-12 md:pt-16">
          <Container>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {t("guidesSection.title")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("guidesSection.subtitle")}
                  </p>
                </div>
              </div>
              <Link
                href="/blog"
                className="hidden sm:flex text-primary text-sm font-medium items-center gap-1 hover:underline"
              >
                {t("guidesSection.viewAll")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link
                href="/blog"
                className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:underline"
              >
                {t("guidesSection.viewAll")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
