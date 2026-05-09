"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Button,
  MarkdownView,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@tge/ui";
import type { ApiArticle, LocalizedString } from "@tge/types";
import { cn } from "@tge/utils";

import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";

type ArticleLocale = "ro" | "en" | "fr" | "de";
const LOCALE_TABS: ArticleLocale[] = ["ro", "en", "fr", "de"];

type DraftSnapshot = {
  title?: Partial<LocalizedString> | null;
  excerpt?: Partial<LocalizedString> | null;
  content?: Partial<LocalizedString> | null;
};

export type ArticleDetailPayload = ApiArticle & {
  draft?: DraftSnapshot | null;
  createdAt?: string;
  updatedAt?: string;
};

interface ArticleDetailViewProps {
  article: ArticleDetailPayload;
}

/**
 * Reader-style preview of an article inside the admin. Renders the same
 * markdown the public site renders (via shared MarkdownView), with a locale
 * switcher and an optional Live/Draft toggle when a pending draft snapshot
 * exists on the row.
 */
export function ArticleDetailView({ article }: ArticleDetailViewProps) {
  const t = useTranslations("Articles");
  const adminLocale = useLocale();
  const initialLocale: ArticleLocale = LOCALE_TABS.includes(
    adminLocale as ArticleLocale,
  )
    ? (adminLocale as ArticleLocale)
    : "ro";

  const [localeTab, setLocaleTab] = useState<ArticleLocale>(initialLocale);
  const [source, setSource] = useState<"live" | "draft">("live");

  const draft = article.draft ?? null;
  const hasDraft = draft !== null;

  const titleSrc =
    source === "draft" && draft?.title ? draft.title : article.title;
  const excerptSrc =
    source === "draft" && draft?.excerpt ? draft.excerpt : article.excerpt;
  const contentSrc =
    source === "draft" && draft?.content ? draft.content : article.content;

  const localizedTitle = pick(titleSrc, localeTab);
  const localizedExcerpt = pick(excerptSrc, localeTab);
  const localizedContent = pick(contentSrc, localeTab);

  const meta: string[] = [];
  if (article.authorName) meta.push(article.authorName);
  if (article.readTimeMinutes)
    meta.push(`${article.readTimeMinutes}m ${t("metaRead")}`);

  return (
    <div className="space-y-6">
      {hasDraft ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-1.5 w-fit">
          <Button
            type="button"
            variant={source === "live" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSource("live")}
            className="h-7 px-3 text-xs"
          >
            {t("previewLive")}
          </Button>
          <Button
            type="button"
            variant={source === "draft" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSource("draft")}
            className="h-7 px-3 text-xs"
          >
            {t("previewDraft")}
          </Button>
        </div>
      ) : null}

      <Tabs
        value={localeTab}
        onValueChange={(value) => setLocaleTab(value as ArticleLocale)}
        className="w-full"
      >
        <TabsList className="h-8 bg-copper/[0.06]">
          {LOCALE_TABS.map((loc) => {
            const empty = !pick(contentSrc, loc) && !pick(titleSrc, loc);
            return (
              <TabsTrigger
                key={loc}
                value={loc}
                className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper"
              >
                {loc.toUpperCase()}
                {empty ? (
                  <span
                    aria-hidden
                    className="ml-1 text-[10px] text-muted-foreground/60"
                  >
                    —
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {LOCALE_TABS.map((loc) => (
          <TabsContent key={loc} value={loc} className="mt-6">
            {/* Body intentionally re-renders by `localeTab`/`source` instead of
                per-tab content, so the live/draft toggle drives a single body. */}
          </TabsContent>
        ))}
      </Tabs>

      <article className="space-y-6">
        {article.coverImage ? (
          <figure className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-muted">
            <Image
              src={article.coverImage}
              alt={localizedTitle || article.slug}
              fill
              sizes="(min-width: 1024px) 768px, 100vw"
              className="object-cover"
              priority={false}
            />
          </figure>
        ) : null}

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={article.status ?? "draft"} />
            <MonoTag>{article.category.replace(/-/g, " ")}</MonoTag>
            {(article.tags ?? []).map((tag) => (
              <MonoTag key={tag} className="bg-transparent">
                {tag}
              </MonoTag>
            ))}
          </div>

          <h1
            className={cn(
              "text-3xl font-semibold leading-tight tracking-tight text-foreground",
              !localizedTitle && "text-muted-foreground italic",
            )}
          >
            {localizedTitle || t("localeMissing")}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {meta.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
            {article.publishedAt ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <RelativeTime value={article.publishedAt} />
              </span>
            ) : null}
            <Mono className="ml-auto text-[11px]">{article.slug}</Mono>
          </div>
        </header>

        {localizedExcerpt ? (
          <p className="border-l-2 border-copper/40 pl-4 text-base italic text-foreground/80">
            {localizedExcerpt}
          </p>
        ) : null}

        <div className="max-w-prose">
          {localizedContent ? (
            <MarkdownView proseSize="lg">{localizedContent}</MarkdownView>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {t("localeMissing")}
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

function pick(
  source: Partial<LocalizedString> | null | undefined,
  locale: ArticleLocale,
): string {
  if (!source) return "";
  return (source[locale] ?? "") as string;
}
