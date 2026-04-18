import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@tge/i18n/navigation";
import { fetchApi, fetchApiSafe } from "@tge/api-client";
import { mapApiArticle, mapApiArticles } from "@tge/api-client";
import type { ApiArticle, Article, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Badge } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ArticleCard } from "@/components/blog/article-card";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";

interface Params {
  slug: string;
}

const categoryColors: Record<string, string> = {
  guide: "bg-primary/10 text-primary border-primary/20",
  news: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "market-report": "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const locale = await getLocale() as Locale;
  try {
    const raw = await fetchApi<ApiArticle>(`/articles/${slug}`);
    const article = mapApiArticle(raw);
    return {
      title: localize(article.title, locale),
      description: localize(article.excerpt, locale),
    };
  } catch {
    return {};
  }
}

export default async function ArticleDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const t = await getTranslations("ArticleDetailPage");
  const tBlog = await getTranslations("BlogPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const locale = await getLocale() as Locale;

  let article;
  try {
    const raw = await fetchApi<ApiArticle>(`/articles/${slug}`);
    article = mapApiArticle(raw);
  } catch {
    notFound();
  }

  const relatedResult = await fetchApiSafe<ApiArticle[]>(
    `/articles?status=published&category=${article.category}&limit=3`,
  );
  const relatedArticles: Article[] = relatedResult.ok
    ? mapApiArticles(relatedResult.data)
        .filter((a) => a.slug !== article.slug)
        .slice(0, 3)
    : [];

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const catColor = categoryColors[article.category] ?? categoryColors.guide;

  return (
    <>
      {/* Hero with cover image */}
      {article.coverImage && (
        <section className="relative h-[280px] sm:h-[360px] md:h-[420px] overflow-hidden">
          <Image
            src={article.coverImage}
            alt={localize(article.title, locale)}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <Container className="relative h-full flex flex-col justify-end pb-8 md:pb-12">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-4 transition-colors w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToBlog")}
            </Link>
            <Badge className={`${catColor} border w-fit mb-3`}>
              {tBlog(`categories.${article.category}`)}
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white max-w-3xl leading-tight">
              {localize(article.title, locale)}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/70 mt-4">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {article.authorName}
              </span>
              {date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {date}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t("minRead", { count: article.readTimeMinutes })}
              </span>
            </div>
          </Container>
        </section>
      )}

      {/* Breadcrumb (below hero) */}
      <section className="pt-6 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("blog"), href: "/blog" },
              { label: localize(article.title, locale) },
            ]}
          />
        </Container>
      </section>

      {/* Article body */}
      <article className="py-10 md:py-14 bg-background">
        <Container>
          <div className="max-w-3xl mx-auto">
            {/* Excerpt / lead */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 border-l-4 border-primary pl-5 italic">
              {localize(article.excerpt, locale)}
            </p>

            {/* Content */}
            <div
              className="prose prose-lg max-w-none
                prose-headings:text-foreground prose-headings:font-bold prose-headings:scroll-mt-20
                prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-5 prose-h2:pb-3 prose-h2:border-b prose-h2:border-border
                prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-foreground/75 prose-p:leading-[1.8] prose-p:mb-5
                prose-strong:text-foreground prose-strong:font-semibold
                prose-ul:text-foreground/75 prose-ul:my-5 prose-ul:pl-5
                prose-ol:text-foreground/75 prose-ol:my-5 prose-ol:pl-5
                prose-li:leading-[1.75] prose-li:mb-2
                prose-a:text-primary prose-a:font-medium prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-primary/80
                prose-blockquote:border-l-primary prose-blockquote:bg-accent/30 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:text-foreground/70 prose-blockquote:not-italic
                prose-img:rounded-xl prose-img:shadow-md
                prose-table:overflow-hidden prose-table:rounded-lg prose-table:border prose-table:border-border
                prose-th:bg-muted prose-th:text-foreground prose-th:font-semibold prose-th:px-4 prose-th:py-3
                prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-border prose-td:text-foreground/75
                prose-hr:border-border prose-hr:my-10"
              dangerouslySetInnerHTML={{
                __html: localize(article.content, locale),
              }}
            />
          </div>
        </Container>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="pb-16 md:pb-24 bg-background border-t border-border pt-12 md:pt-16">
          <Container>
            <h2 className="text-2xl font-bold text-foreground mb-8">
              {t("relatedArticles")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
