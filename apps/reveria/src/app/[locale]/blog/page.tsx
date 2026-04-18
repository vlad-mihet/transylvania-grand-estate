import { getLocale, getTranslations } from "next-intl/server";
import type { ApiArticle, Locale } from "@tge/types";
import { fetchApiSafe, mapApiArticles } from "@tge/api-client";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ArticleCard } from "@/components/blog/article-card";
import { BlogCategoryTabs } from "@/components/blog/blog-category-tabs";
import {
  isBlogCategory,
  type BlogCategory,
} from "@/components/blog/blog-category";
import { FileText } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("BlogPage");
  return { title: t("hero.title"), description: t("hero.subtitle") };
}

interface BlogPageProps {
  searchParams: Promise<{ category?: string | string[] }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const t = await getTranslations("BlogPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  // Locale is only used for typing the articles post-mapping. Reading it here
  // keeps the SSR path consistent with the rest of the app even if a future
  // ArticleCard variant wants it.
  void ((await getLocale()) as Locale);

  const rawCategory = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const category: BlogCategory = isBlogCategory(rawCategory)
    ? rawCategory
    : "all";

  const qs = new URLSearchParams({ status: "published", limit: "24" });
  if (category !== "all") qs.set("category", category);

  const result = await fetchApiSafe<ApiArticle[]>(`/articles?${qs}`);
  const articles = result.ok ? mapApiArticles(result.data) : [];
  const hasError = !result.ok;

  return (
    <>
      <PageHeader
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        breadcrumbItems={[
          { label: tBreadcrumb("home"), href: "/" },
          { label: tBreadcrumb("blog") },
        ]}
      />

      <section className="pb-16 md:pb-24 bg-background">
        <Container>
          <BlogCategoryTabs value={category} />

          {hasError ? (
            <div className="text-center py-20">
              <FileText className="h-12 w-12 text-destructive/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("loadError.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("loadError.description")}
              </p>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("noArticles.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("noArticles.description")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
