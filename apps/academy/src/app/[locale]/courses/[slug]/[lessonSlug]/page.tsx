"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError, getAccessToken, clearTokens } from "@/lib/api-client";
import { AppHeader } from "@/components/app-header";
import { LessonVideoPlayer } from "@/components/lesson-video-player";

type LessonDetail = {
  id: string;
  slug: string;
  order: number;
  title: Record<string, string | undefined>;
  excerpt: Record<string, string | undefined>;
  type: "text" | "video";
  readingTimeMinutes: number | null;
  videoDurationSeconds: number | null;
  publishedAt: string | null;
  videoUrl: string | null;
  content: string;
  servedLocale: string;
  localizedTitle: string;
  localizedExcerpt: string;
};

export default function LessonPage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const params = useParams<{ slug: string; lessonSlug: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<LessonDetail>(
      `/academy/courses/${encodeURIComponent(params.slug)}/lessons/${encodeURIComponent(params.lessonSlug)}?locale=${locale}`,
      { locale },
    )
      .then(setLesson)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, [params.slug, params.lessonSlug, locale, router]);

  if (loading)
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-3xl px-6 py-12">…</div>
      </>
    );
  if (error || !lesson) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm text-red-600" role="alert">
            {error ?? t("errors.generic")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
    <AppHeader />
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href={{ pathname: "/courses/[slug]", params: { slug: params.slug } }}
        className="mb-6 inline-block text-sm text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-primary)]"
      >
        ← {t("lesson.back")}
      </Link>
      <p className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        {t("course.lessonsTitle")} {String(Math.round(lesson.order / 10)).padStart(2, "0")}
      </p>
      <h1 className="mt-2 text-3xl font-semibold">{lesson.localizedTitle}</h1>
      {lesson.servedLocale !== locale ? (
        <p className="mt-3 rounded-md bg-[color:var(--color-muted)] px-3 py-2 text-xs text-[color:var(--color-muted-foreground)]">
          {t("lesson.translationPending")}
        </p>
      ) : null}
      {lesson.type === "video" && lesson.videoUrl ? (
        <LessonVideoPlayer src={lesson.videoUrl} title={lesson.localizedTitle} />
      ) : null}
      <article className="lesson-prose mt-8 prose prose-neutral max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
      </article>
    </div>
    </>
  );
}
