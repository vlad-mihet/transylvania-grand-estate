"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError, getAccessToken, clearTokens } from "@/lib/api-client";
import { AppHeader } from "@/components/app-header";

type CourseDetail = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  description: Record<string, string | undefined>;
  coverImage: string | null;
  publishedAt: string | null;
  visibility: "public" | "enrolled";
  enrolled: boolean;
  canUnenroll?: boolean;
  servedLocale: string;
  localizedTitle: string;
  localizedDescription: string;
  lessons: Array<{
    id: string;
    slug: string;
    order: number;
    title: Record<string, string | undefined>;
    excerpt: Record<string, string | undefined>;
    type: "text" | "video";
    // Computed server-side from the served-locale content on every read;
    // always set for text, null for video.
    readingTimeMinutes: number | null;
    // Stored duration in seconds for video lessons; null for text.
    videoDurationSeconds: number | null;
    publishedAt: string | null;
  }>;
};

export default function CoursePage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<CourseDetail>(
      `/academy/courses/${encodeURIComponent(params.slug)}?locale=${locale}`,
      { locale },
    )
      .then(setCourse)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, [params.slug, locale, router]);

  async function onEnroll() {
    if (!course || enrolling) return;
    setEnrolling(true);
    try {
      await apiFetch<{ enrolled: boolean }>(
        `/academy/courses/${encodeURIComponent(params.slug)}/enroll`,
        { method: "POST", locale },
      );
      // Server is authoritative, but optimistic flip is fine: the endpoint
      // only resolves with enrolled=true on success. `canUnenroll` goes
      // true when the row is new self-service; it stays false when the
      // user was already wildcard-covered (server reported reason='wildcard').
      setCourse({ ...course, enrolled: true, canUnenroll: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("course.enrollFailed"));
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-6 py-12">…</div>
      </>
    );
  }
  if (error || !course) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-6 py-12">
          <p className="text-sm text-red-600" role="alert">
            {error ?? t("errors.generic")}
          </p>
          <Link href="/" className="mt-4 inline-block text-sm underline">
            {t("appName")}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
    <AppHeader />
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-primary)]"
      >
        ← {t("appName")}
      </Link>
      <h1 className="text-3xl font-semibold">{course.localizedTitle}</h1>
      <p className="mt-2 text-base text-[color:var(--color-muted-foreground)]">
        {course.localizedDescription}
      </p>
      {course.servedLocale !== locale ? (
        <p className="mt-3 inline-block rounded-full bg-[color:var(--color-muted)] px-3 py-1 text-xs text-[color:var(--color-muted-foreground)]">
          {t("course.translationPendingBadge", { locale: course.servedLocale })}
        </p>
      ) : null}

      {course.visibility === "public" ? (
        <div className="mt-6">
          {course.enrolled ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700">
              <span aria-hidden="true">✓</span>
              {t("course.enrolledBadge")}
            </span>
          ) : (
            <button
              type="button"
              onClick={onEnroll}
              disabled={enrolling}
              className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {enrolling ? t("course.enrollPending") : t("course.enrollButton")}
            </button>
          )}
        </div>
      ) : null}

      <h2 className="mt-10 text-lg font-semibold">{t("course.lessonsTitle")}</h2>
      <ol className="mt-4 divide-y divide-[color:var(--color-border)] rounded-lg border border-[color:var(--color-border)]">
        {course.lessons.map((lesson, idx) => (
          <li key={lesson.id}>
            <Link
              href={{
                pathname: "/courses/[slug]/[lessonSlug]",
                params: { slug: course.slug, lessonSlug: lesson.slug },
              }}
              className="flex items-center justify-between px-5 py-4 transition hover:bg-[color:var(--color-muted)]"
            >
              <div>
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 font-medium">
                  {pickLocalized(lesson.title, locale)}
                </p>
              </div>
              <div className="text-right text-xs text-[color:var(--color-muted-foreground)]">
                <p>{lesson.type === "video" ? t("course.videoBadge") : t("course.readingBadge")}</p>
                {lesson.type === "text" && lesson.readingTimeMinutes ? (
                  <p className="mt-1">
                    {t("course.readingTime", { count: lesson.readingTimeMinutes })}
                  </p>
                ) : lesson.type === "video" && lesson.videoDurationSeconds != null ? (
                  <p className="mt-1">
                    {t("course.videoDuration", {
                      minutes: Math.floor(lesson.videoDurationSeconds / 60),
                      seconds: String(lesson.videoDurationSeconds % 60).padStart(2, "0"),
                    })}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
    </>
  );
}

function pickLocalized(
  obj: Record<string, string | undefined> | undefined,
  locale: string,
): string {
  if (!obj) return "";
  const fallbackOrder = [locale, "ro", "en", "fr", "de"];
  for (const key of fallbackOrder) {
    const value = obj[key];
    if (value && value.trim()) return value;
  }
  return "";
}
