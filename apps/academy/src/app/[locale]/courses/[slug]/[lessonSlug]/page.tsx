"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError, getAccessToken, clearTokens } from "@/lib/api-client";
import { AppHeader } from "@/components/app-header";
import { LessonVideoPlayer } from "@/components/lesson-video-player";

type LessonNeighbour = { slug: string; localizedTitle: string } | null;

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
  completed: boolean;
  completedAt: string | null;
  prev: LessonNeighbour;
  next: LessonNeighbour;
};

export default function LessonPage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const params = useParams<{ slug: string; lessonSlug: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  // Course title is shown in the breadcrumb. We don't want a second fetch;
  // we derive it from `document.referrer` fallback of the course slug if
  // the user deep-links here, but the common path is a navigation from
  // course detail which carries the title in the URL path we can decode.
  // Simpler: fetch the course title lazily when needed.
  const [courseTitle, setCourseTitle] = useState<string | null>(null);

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
    // Best-effort title fetch for the breadcrumb. Failures are silent —
    // we fall back to rendering the slug.
    apiFetch<{ localizedTitle: string }>(
      `/academy/courses/${encodeURIComponent(params.slug)}?locale=${locale}`,
      { locale },
    )
      .then((res) => setCourseTitle(res.localizedTitle))
      .catch(() => undefined);
  }, [params.slug, params.lessonSlug, locale, router]);

  async function onMarkComplete() {
    if (!lesson || completing) return;
    setCompleting(true);
    try {
      await apiFetch(
        `/academy/courses/${encodeURIComponent(params.slug)}/lessons/${encodeURIComponent(params.lessonSlug)}/complete`,
        { method: "POST", locale },
      );
      if (lesson.next) {
        // Next lesson exists — navigate. The toast fires briefly before
        // the navigation starts.
        toast.success(t("lesson.completeSuccess"));
        router.push({
          pathname: "/courses/[slug]/[lessonSlug]",
          params: { slug: params.slug, lessonSlug: lesson.next.slug },
        });
      } else {
        // Last lesson of the course — celebrate and go back to the TOC.
        toast.success(t("lesson.courseCompletedToast"));
        router.push({
          pathname: "/courses/[slug]",
          params: { slug: params.slug },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setCompleting(false);
    }
  }

  if (loading)
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-6 py-12">…</div>
      </>
    );
  if (error || !lesson) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-6 py-12">
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
      <div className="mx-auto max-w-5xl px-6 py-8">
        <nav
          className="mb-4 flex items-center gap-1.5 text-sm text-[color:var(--color-muted-foreground)]"
          aria-label="breadcrumb"
        >
          <Link href="/" className="hover:text-[color:var(--color-primary)]">
            {t("appName")}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={{ pathname: "/courses/[slug]", params: { slug: params.slug } }}
            className="truncate hover:text-[color:var(--color-primary)]"
          >
            {courseTitle ?? params.slug}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground">
            {lesson.localizedTitle}
          </span>
        </nav>

        <div className="mb-6 flex items-center justify-between gap-3 text-sm text-[color:var(--color-muted-foreground)]">
          {lesson.prev ? (
            <Link
              href={{
                pathname: "/courses/[slug]/[lessonSlug]",
                params: {
                  slug: params.slug,
                  lessonSlug: lesson.prev.slug,
                },
              }}
              className="inline-flex items-center gap-1 hover:text-[color:var(--color-primary)]"
              aria-label={t("lesson.prevAriaLabel", {
                title: lesson.prev.localizedTitle,
              })}
            >
              <span aria-hidden="true">←</span>
              <span className="max-w-[20ch] truncate">
                {lesson.prev.localizedTitle}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {lesson.next ? (
            <Link
              href={{
                pathname: "/courses/[slug]/[lessonSlug]",
                params: {
                  slug: params.slug,
                  lessonSlug: lesson.next.slug,
                },
              }}
              className="inline-flex items-center gap-1 hover:text-[color:var(--color-primary)]"
              aria-label={t("lesson.nextAriaLabel", {
                title: lesson.next.localizedTitle,
              })}
            >
              <span className="max-w-[20ch] truncate">
                {lesson.next.localizedTitle}
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span />
          )}
        </div>

        <p className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          {t("course.lessonsTitle")}{" "}
          {String(Math.round(lesson.order / 10)).padStart(2, "0")}
          {lesson.completed ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-emerald-700">
              <span aria-hidden="true">✓</span>
              {t("lesson.completedPill")}
            </span>
          ) : null}
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {lesson.content}
          </ReactMarkdown>
        </article>

        <div className="mt-10 flex flex-col items-stretch gap-4 border-t border-[color:var(--color-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-[color:var(--color-muted-foreground)]">
            {lesson.prev ? (
              <Link
                href={{
                  pathname: "/courses/[slug]/[lessonSlug]",
                  params: {
                    slug: params.slug,
                    lessonSlug: lesson.prev.slug,
                  },
                }}
                className="inline-flex items-center gap-1 hover:text-[color:var(--color-primary)]"
              >
                <span aria-hidden="true">←</span>
                {t("lesson.previous")}
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {lesson.completed ? (
              lesson.next ? (
                <Link
                  href={{
                    pathname: "/courses/[slug]/[lessonSlug]",
                    params: {
                      slug: params.slug,
                      lessonSlug: lesson.next.slug,
                    },
                  }}
                  className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t("lesson.next")} →
                </Link>
              ) : (
                <Link
                  href={{
                    pathname: "/courses/[slug]",
                    params: { slug: params.slug },
                  }}
                  className="rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm font-medium text-foreground transition hover:bg-[color:var(--color-muted)]"
                >
                  {t("lesson.backToCourse")}
                </Link>
              )
            ) : (
              <button
                type="button"
                onClick={onMarkComplete}
                disabled={completing}
                className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {completing
                  ? t("lesson.completePending")
                  : t("lesson.markDoneAndNext")}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
