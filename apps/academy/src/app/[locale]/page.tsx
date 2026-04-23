"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError, getAccessToken, clearTokens } from "@/lib/api-client";
import { AppHeader } from "@/components/app-header";

type CourseSummary = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  description: Record<string, string | undefined>;
  coverImage: string | null;
  lessonCount: number;
  order: number;
  publishedAt: string | null;
};

export default function DashboardPage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<CourseSummary[]>("/academy/courses", { locale })
      .then(setCourses)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          router.replace("/login");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setError(t("errors.notEnrolled"));
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, [locale, router, t]);

  return (
    <>
      <AppHeader />
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-[color:var(--color-primary)]">
          {t("appName")}
        </p>
        <h1 className="mt-1 text-3xl font-semibold">{t("dashboard.title")}</h1>
        {/* Account link lives in the header now; the inline one here was
            duplicate navigation since the sticky AppHeader is always in
            sight. Keep the structural div to preserve the heading spacing. */}
        <Link
          href="/account"
          className="hidden text-sm text-[color:var(--color-muted-foreground)] underline"
        >
          {t("account.title")}
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-[color:var(--color-muted-foreground)]">…</p>
      ) : error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          {t("dashboard.empty")}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={{ pathname: "/courses/[slug]", params: { slug: course.slug } }}
              className="group block rounded-lg border border-[color:var(--color-border)] p-6 transition hover:border-[color:var(--color-primary)] hover:shadow-sm"
            >
              <h2 className="text-xl font-semibold group-hover:text-[color:var(--color-primary)]">
                {pickLocalized(course.title, locale)}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)] line-clamp-3">
                {pickLocalized(course.description, locale)}
              </p>
              <p className="mt-4 text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                {course.lessonCount} {t("course.lessonsTitle").toLowerCase()}
              </p>
            </Link>
          ))}
        </div>
      )}
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
