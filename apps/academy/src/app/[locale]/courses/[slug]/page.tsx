"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState, SubmitButton } from "@tge/ui";
import { Link, useRouter as useI18nRouter } from "@/i18n/navigation";
import { AppHeader } from "@/components/app-header";
import { CourseSkeleton } from "@/components/skeletons";
import { Pagination } from "@/components/pagination";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useCourse, useCourseLessons } from "@/hooks/queries";
import { useEnroll } from "@/hooks/mutations";

const PAGE_PARAM = "page";
const SEARCH_PARAM = "q";
const LESSONS_PER_PAGE = 20;

export default function CoursePage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const i18nRouter = useI18nRouter();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isReady } = useAuthGuard();
  const courseQuery = useCourse(params.slug, locale);
  const enroll = useEnroll();

  // URL state. `?q=` is debounced into a separate state so typing doesn't
  // hammer the API. `?page=` is read straight off the URL.
  const urlSearch = searchParams.get(SEARCH_PARAM) ?? "";
  const urlPage = Number(searchParams.get(PAGE_PARAM) ?? 0);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

  // Debounce search → URL → API. 250ms feels responsive while keeping
  // the request count sane on long titles.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput), 250);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  // First-load: if the URL has no `?page`, derive the initial page from the
  // student's resume position so the TOC opens with their current lesson
  // visible. Subsequent navigation respects the URL. We snapshot
  // `appliedAutoJumpRef` so the auto-jump only fires once per mount.
  const appliedAutoJumpRef = useRef(false);
  const resolvedPage = useMemo(() => {
    if (urlPage >= 1) return urlPage;
    const resume = courseQuery.data?.progress.resumeLessonPosition ?? null;
    if (!resume) return 1;
    return Math.max(1, Math.ceil(resume / LESSONS_PER_PAGE));
  }, [urlPage, courseQuery.data?.progress.resumeLessonPosition]);

  // When debounced search changes, reset to page 1 (a search hit on
  // page 7 would render an empty grid otherwise).
  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearch) params.set(SEARCH_PARAM, debouncedSearch);
      else params.delete(SEARCH_PARAM);
      params.delete(PAGE_PARAM);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Auto-jump effect — set `?page=` to the resume page on first mount when
  // the URL is bare. Done as an effect so we can run it after the course
  // detail loads (which is when resumeLessonPosition becomes known).
  useEffect(() => {
    if (appliedAutoJumpRef.current) return;
    if (urlPage >= 1) {
      appliedAutoJumpRef.current = true;
      return;
    }
    const resume = courseQuery.data?.progress.resumeLessonPosition ?? null;
    if (!resume || resume <= LESSONS_PER_PAGE) {
      // First page anyway — no rewrite needed; we just lock the flag so
      // a later course-detail refetch doesn't suddenly relocate the user.
      appliedAutoJumpRef.current = true;
      return;
    }
    appliedAutoJumpRef.current = true;
    const targetPage = Math.ceil(resume / LESSONS_PER_PAGE);
    const params = new URLSearchParams(searchParams.toString());
    params.set(PAGE_PARAM, String(targetPage));
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseQuery.data?.progress.resumeLessonPosition]);

  const lessonsQuery = useCourseLessons(
    params.slug,
    locale,
    resolvedPage,
    debouncedSearch,
    LESSONS_PER_PAGE,
  );

  const lessonsRef = useRef<HTMLOListElement | null>(null);

  async function onEnroll() {
    if (!courseQuery.data || enroll.isPending) return;
    try {
      await enroll.mutateAsync({ slug: params.slug, locale });
      toast.success(t("course.enrollSuccess"));
      const firstLesson =
        courseQuery.data.progress.resumeLessonSlug ??
        courseQuery.data.firstLessonSlug ??
        null;
      if (firstLesson) {
        i18nRouter.push({
          pathname: "/courses/[slug]/[lessonSlug]",
          params: { slug: params.slug, lessonSlug: firstLesson },
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("course.enrollFailed");
      toast.error(message);
    }
  }

  const onPageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 1) params.delete(PAGE_PARAM);
    else params.set(PAGE_PARAM, String(next));
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  if (!isReady || courseQuery.isLoading) {
    return (
      <>
        <AppHeader />
        <CourseSkeleton />
      </>
    );
  }
  if (courseQuery.error || !courseQuery.data) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-6 py-12">
          <ErrorState
            title={t("errors.generic")}
            description={courseQuery.error?.message}
            onRetry={() => courseQuery.refetch()}
            retryLabel={t("errors.retry")}
          />
          <Link href="/" className="mt-4 inline-block text-sm underline">
            {t("appName")}
          </Link>
        </div>
      </>
    );
  }

  const course = courseQuery.data;
  const canStart = course.enrolled || course.visibility === "public";
  const resumeSlug =
    course.progress.resumeLessonSlug ?? course.firstLessonSlug ?? null;
  const isStarted = !!course.progress.lastSeenAt;
  const allDone =
    course.progress.totalLessons > 0 &&
    course.progress.completedLessons >= course.progress.totalLessons;
  const startLabel = allDone
    ? t("course.reviewButton")
    : isStarted
      ? t("course.continueButton")
      : t("course.startButton");
  const showEnrollButton = course.visibility === "public" && !course.enrolled;

  const lessons = lessonsQuery.data?.data ?? [];
  const meta = lessonsQuery.data?.meta;
  const isFiltered = debouncedSearch.trim().length > 0;
  const resumePage = course.progress.resumeLessonPosition
    ? Math.max(
        1,
        Math.ceil(
          course.progress.resumeLessonPosition / LESSONS_PER_PAGE,
        ),
      )
    : null;
  const showJumpToResume =
    resumeSlug && resumePage !== null && resumePage !== resolvedPage;

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <nav
          className="mb-6 flex items-center gap-1.5 text-sm text-[color:var(--color-muted-foreground)]"
          aria-label="breadcrumb"
        >
          <Link href="/" className="hover:text-[color:var(--color-primary)]">
            {t("appName")}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground">
            {course.localizedTitle}
          </span>
        </nav>
        <h1 className="text-3xl font-semibold">{course.localizedTitle}</h1>
        <p className="mt-2 text-base text-[color:var(--color-muted-foreground)]">
          {course.localizedDescription}
        </p>
        {course.servedLocale !== locale ? (
          <p className="mt-3 inline-block rounded-full bg-[color:var(--color-muted)] px-3 py-1 text-xs text-[color:var(--color-muted-foreground)]">
            {t("course.translationPendingBadge", { locale: course.servedLocale })}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {showEnrollButton ? (
            <SubmitButton
              type="button"
              onClick={onEnroll}
              loading={enroll.isPending}
              loadingLabel={t("course.enrollPending")}
            >
              {t("course.enrollButton")}
            </SubmitButton>
          ) : canStart && resumeSlug ? (
            <Link
              href={{
                pathname: "/courses/[slug]/[lessonSlug]",
                params: { slug: course.slug, lessonSlug: resumeSlug },
              }}
              className="inline-flex h-9 items-center justify-center rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              {startLabel}
            </Link>
          ) : null}
          {course.enrolled && !showEnrollButton ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700">
              <span aria-hidden="true">✓</span>
              {t("course.enrolledBadge")}
            </span>
          ) : null}
          {course.progress.totalLessons > 0 ? (
            <span className="text-xs text-[color:var(--color-muted-foreground)]">
              {t("course.progressLabel", {
                completed: course.progress.completedLessons,
                total: course.progress.totalLessons,
              })}
            </span>
          ) : null}
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">{t("course.lessonsTitle")}</h2>
          <div className="w-full max-w-xs">
            <label htmlFor="lesson-search" className="sr-only">
              {t("course.searchLessonsPlaceholder")}
            </label>
            <input
              id="lesson-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("course.searchLessonsPlaceholder")}
              className="h-9 w-full rounded-md border border-[color:var(--color-border)] bg-background px-3 text-sm text-foreground outline-none placeholder:text-[color:var(--color-muted-foreground)] focus:border-[color:var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2"
            />
          </div>
        </div>

        {showJumpToResume ? (
          <div
            className="sticky top-2 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/5 px-4 py-2.5 text-sm backdrop-blur"
          >
            <p className="text-[color:var(--color-foreground)]">
              <span aria-hidden="true">↪︎</span>{" "}
              {t("course.jumpToResumeMessage", {
                position: course.progress.resumeLessonPosition ?? 0,
              })}
            </p>
            <button
              type="button"
              onClick={() => onPageChange(resumePage!)}
              className="inline-flex h-8 items-center rounded-md border border-[color:var(--color-primary)] bg-[color:var(--color-primary)] px-3 text-xs font-medium text-white transition hover:opacity-90"
            >
              {t("course.jumpToResumeAction")}
            </button>
          </div>
        ) : null}

        {lessonsQuery.error ? (
          <div className="mt-6">
            <ErrorState
              title={t("errors.generic")}
              description={lessonsQuery.error.message}
              onRetry={() => lessonsQuery.refetch()}
              retryLabel={t("errors.retry")}
            />
          </div>
        ) : lessons.length === 0 && !lessonsQuery.isLoading ? (
          <p className="mt-6 rounded-md border border-dashed border-[color:var(--color-border)] px-4 py-10 text-center text-sm text-[color:var(--color-muted-foreground)]">
            {isFiltered
              ? t("course.searchEmpty", { query: debouncedSearch })
              : t("course.lessonsEmpty")}
          </p>
        ) : (
          <ol
            ref={lessonsRef}
            className="mt-4 divide-y divide-[color:var(--color-border)] rounded-lg border border-[color:var(--color-border)]"
            aria-busy={lessonsQuery.isFetching}
          >
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={{
                    pathname: "/courses/[slug]/[lessonSlug]",
                    params: { slug: course.slug, lessonSlug: lesson.slug },
                  }}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[color:var(--color-muted)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">
                      {String(lesson.position).padStart(2, "0")}
                    </p>
                    <p className="mt-1 font-medium">{lesson.localizedTitle}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right text-xs text-[color:var(--color-muted-foreground)]">
                    {lesson.completed ? (
                      <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-700">
                        <span aria-hidden="true">✓</span>
                        {t("course.lessonCompletedBadge")}
                      </span>
                    ) : null}
                    <p>
                      {lesson.type === "video"
                        ? t("course.videoBadge")
                        : t("course.readingBadge")}
                    </p>
                    {lesson.type === "text" && lesson.readingTimeMinutes ? (
                      <p>
                        {t("course.readingTime", {
                          count: lesson.readingTimeMinutes,
                        })}
                      </p>
                    ) : lesson.type === "video" &&
                      lesson.videoDurationSeconds != null ? (
                      <p>
                        {t("course.videoDuration", {
                          minutes: Math.floor(
                            lesson.videoDurationSeconds / 60,
                          ),
                          seconds: String(
                            lesson.videoDurationSeconds % 60,
                          ).padStart(2, "0"),
                        })}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {meta && lessons.length > 0 ? (
          <div className="mt-8">
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={onPageChange}
              scrollTargetRef={lessonsRef}
              compact
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
