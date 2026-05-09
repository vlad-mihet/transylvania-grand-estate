"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { MarkdownView } from "@tge/ui";
import { useLocale, useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { LessonAttachments } from "@/components/lesson-attachments";
import type { LessonAttachment } from "@/hooks/queries";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type PreviewLesson = {
  id: string;
  slug: string;
  type: "text" | "video";
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  readingTimeMinutes: number | null;
  servedLocale: "ro" | "en" | "fr" | "de";
  localizedTitle: string;
  localizedExcerpt: string;
  content: string;
  attachments: LessonAttachment[];
  preview: true;
};

/**
 * Admin preview entry point for a single lesson. The admin minted a
 * one-shot preview token from the lesson edit page; the academy app
 * accepts that token via `?previewToken=` and renders the lesson
 * detail with a persistent banner so the editor knows they're not
 * looking at the live student view.
 *
 * The token is held in component state only — never persisted. A page
 * reload that drops the query param dumps the editor back to a "no
 * token" state, by design.
 */
export default function LessonPreviewPage() {
  const t = useTranslations("Preview");
  const locale = useLocale();
  const params = useParams<{ lessonId: string }>();
  const search = useSearchParams();
  const previewToken = useMemo(() => search.get("previewToken"), [search]);

  const [lesson, setLesson] = useState<PreviewLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!previewToken) {
        setError(t("missingToken"));
        setLoading(false);
        return;
      }
      try {
        const url = `${API_URL}/academy/preview/lessons/${params.lessonId}?locale=${locale}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${previewToken}` },
        });
        if (!res.ok) {
          if (res.status === 401) {
            setError(t("expired"));
          } else if (res.status === 404) {
            setError(t("notFound"));
          } else {
            setError(t("genericFailure"));
          }
          setLoading(false);
          return;
        }
        const data = (await res.json()) as { data?: PreviewLesson } | PreviewLesson;
        const payload =
          "data" in data && data.data ? data.data : (data as PreviewLesson);
        if (!cancelled) {
          setLesson(payload);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(t("genericFailure"));
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.lessonId, previewToken, locale, t]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/40">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-2.5">
          <Eye className="h-4 w-4 shrink-0 text-yellow-700 dark:text-yellow-400" />
          <div>
            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
              {t("bannerTitle")}
            </p>
            <p className="text-xs text-yellow-800/80 dark:text-yellow-200/80">
              {t("bannerSubtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {loading && (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        )}
        {error && (
          <div className="rounded-md border border-border bg-card p-6 text-sm">
            <p className="font-semibold">{t("errorTitle")}</p>
            <p className="mt-2 text-muted-foreground">{error}</p>
          </div>
        )}
        {lesson && (
          <article className="space-y-6">
            <header>
              <h1 className="text-3xl font-semibold leading-tight">
                {lesson.localizedTitle}
              </h1>
              {lesson.localizedExcerpt && (
                <p className="mt-2 text-base text-muted-foreground">
                  {lesson.localizedExcerpt}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                {lesson.type === "text" && lesson.readingTimeMinutes ? (
                  <span>~{lesson.readingTimeMinutes} min</span>
                ) : null}
                {lesson.servedLocale !== locale && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.06em]">
                    {t("fallbackLocale", { locale: lesson.servedLocale })}
                  </span>
                )}
              </div>
            </header>

            {lesson.type === "video" && lesson.videoUrl && (
              <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
                <iframe
                  src={lesson.videoUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {lesson.content && (
              <div className="prose prose-neutral max-w-none dark:prose-invert">
                <MarkdownView>{lesson.content}</MarkdownView>
              </div>
            )}

            <LessonAttachments attachments={lesson.attachments ?? []} />
          </article>
        )}
      </div>
    </div>
  );
}
