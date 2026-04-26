"use client";

import { useTransition } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState, SubmitButton } from "@tge/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { AppHeader } from "@/components/app-header";
import { LessonVideoPlayer } from "@/components/lesson-video-player";
import { LessonSkeleton } from "@/components/skeletons";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useCourse, useLesson } from "@/hooks/queries";
import { useCompleteLesson } from "@/hooks/mutations";

export default function LessonPage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const params = useParams<{ slug: string; lessonSlug: string }>();
  const router = useRouter();
  const { isReady } = useAuthGuard();
  const query = useLesson(params.slug, params.lessonSlug, locale);
  // Course title for breadcrumb comes from the parent course query — cached
  // by react-query so the common path (lesson nav from course detail)
  // reuses the cache, and deep links still work via a background fetch.
  const courseQuery = useCourse(params.slug, locale);
  const complete = useCompleteLesson();
  const [navPending, startTransition] = useTransition();

  function navigateToLesson(slug: string, lessonSlug: string) {
    startTransition(() => {
      router.push({
        pathname: "/courses/[slug]/[lessonSlug]",
        params: { slug, lessonSlug },
      });
    });
  }

  function navigateToCourse(slug: string) {
    startTransition(() => {
      router.push({ pathname: "/courses/[slug]", params: { slug } });
    });
  }

  async function onMarkComplete() {
    if (!query.data || complete.isPending) return;
    try {
      await complete.mutateAsync({
        slug: params.slug,
        lessonSlug: params.lessonSlug,
        locale,
      });
      if (query.data.next) {
        toast.success(t("lesson.completeSuccess"));
        navigateToLesson(params.slug, query.data.next.slug);
      } else {
        toast.success(t("lesson.courseCompletedToast"));
        navigateToCourse(params.slug);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  if (!isReady || query.isLoading) {
    return (
      <>
        <AppHeader navPending={navPending} />
        <LessonSkeleton />
      </>
    );
  }
  if (query.error || !query.data) {
    return (
      <>
        <AppHeader navPending={navPending} />
        <div className="mx-auto max-w-5xl px-6 py-12">
          <ErrorState
            title={t("errors.generic")}
            description={query.error?.message}
            onRetry={() => query.refetch()}
            retryLabel={t("errors.retry")}
          />
        </div>
      </>
    );
  }

  const lesson = query.data;
  const courseTitle = courseQuery.data?.localizedTitle ?? params.slug;

  return (
    <>
      <AppHeader navPending={navPending} />
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
            {courseTitle}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground">
            {lesson.localizedTitle}
          </span>
        </nav>

        <div className="mb-6 flex items-center justify-between gap-3 text-sm text-[color:var(--color-muted-foreground)]">
          {lesson.prev ? (
            <button
              type="button"
              onClick={() =>
                lesson.prev && navigateToLesson(params.slug, lesson.prev.slug)
              }
              disabled={navPending}
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-primary)] disabled:opacity-60"
              aria-label={t("lesson.prevAriaLabel", {
                title: lesson.prev.localizedTitle,
              })}
            >
              <span aria-hidden="true">←</span>
              <span className="max-w-[20ch] truncate">
                {lesson.prev.localizedTitle}
              </span>
            </button>
          ) : (
            <span />
          )}
          {lesson.next ? (
            <button
              type="button"
              onClick={() =>
                lesson.next && navigateToLesson(params.slug, lesson.next.slug)
              }
              disabled={navPending}
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-primary)] disabled:opacity-60"
              aria-label={t("lesson.nextAriaLabel", {
                title: lesson.next.localizedTitle,
              })}
            >
              <span className="max-w-[20ch] truncate">
                {lesson.next.localizedTitle}
              </span>
              <span aria-hidden="true">→</span>
            </button>
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
        <article className="lesson-prose mt-8 prose prose-neutral max-w-[72ch] md:max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {lesson.content}
          </ReactMarkdown>
        </article>

        <div className="mt-10 flex flex-col items-stretch gap-4 border-t border-[color:var(--color-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-[color:var(--color-muted-foreground)]">
            {lesson.prev ? (
              <button
                type="button"
                onClick={() =>
                  lesson.prev && navigateToLesson(params.slug, lesson.prev.slug)
                }
                disabled={navPending}
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 py-2 hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-primary)] disabled:opacity-60"
              >
                <span aria-hidden="true">←</span>
                {t("lesson.previous")}
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {lesson.completed ? (
              lesson.next ? (
                <button
                  type="button"
                  onClick={() =>
                    lesson.next &&
                    navigateToLesson(params.slug, lesson.next.slug)
                  }
                  disabled={navPending}
                  className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {t("lesson.next")} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigateToCourse(params.slug)}
                  disabled={navPending}
                  className="rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm font-medium text-foreground transition hover:bg-[color:var(--color-muted)] disabled:opacity-60"
                >
                  {t("lesson.backToCourse")}
                </button>
              )
            ) : (
              <SubmitButton
                type="button"
                onClick={onMarkComplete}
                loading={complete.isPending || navPending}
                loadingLabel={t("lesson.completePending")}
              >
                {t("lesson.markDoneAndNext")}
              </SubmitButton>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
