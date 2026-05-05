"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Article } from "@tge/types";
import { ArticleCard } from "@/components/blog/article-card";
import { Container } from "@/components/layout/container";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RecentArticlesProps {
  articles: Article[];
}

export function RecentArticles({ articles }: RecentArticlesProps) {
  const t = useTranslations("HomePage.articles");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => { checkScroll(); }, [articles]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  };

  if (articles.length === 0) return null;

  return (
    <section className="py-12 sm:py-14 md:py-20">
      <Container>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{t("title")}</h2>
          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors hidden sm:block"
            >
              {t("viewAll")}
            </Link>
            <div className="flex gap-1.5">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-none"
        >
          {articles.map((article) => (
            <div
              key={article.id}
              className="snap-start shrink-0 w-[280px] sm:w-[300px] md:w-[320px] h-full"
            >
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
