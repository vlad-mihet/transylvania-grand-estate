"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Article, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Badge } from "@tge/ui";
import { Clock, Calendar } from "lucide-react";

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const t = useTranslations("BlogPage");
  const locale = useLocale() as Locale;

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Link
      href={{ pathname: "/blog/[slug]", params: { slug: article.slug } }}
      className="group block h-full"
    >
      <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={localize(article.title, locale)}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : null}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="text-xs">
              {t(`categories.${article.category}`)}
            </Badge>
          </div>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            {date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {date}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("minRead", { count: article.readTimeMinutes })}
            </span>
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {localize(article.title, locale)}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
            {localize(article.excerpt, locale)}
          </p>
          <span className="text-primary text-sm font-medium mt-3 group-hover:underline">
            {t("readMore")}
          </span>
        </div>
      </div>
    </Link>
  );
}
