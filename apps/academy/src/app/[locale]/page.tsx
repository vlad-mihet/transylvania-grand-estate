"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError, getAccessToken, clearTokens } from "@/lib/api-client";
import { AppHeader } from "@/components/app-header";
import { CourseCard, type CourseSummary } from "@/components/course-card";

export default function DashboardPage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unenrollingSlug, setUnenrollingSlug] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, [locale, router]);

  async function onUnenroll(slug: string) {
    const target = courses.find((c) => c.slug === slug);
    const courseTitle =
      target?.title[locale] ?? target?.title.ro ?? target?.slug ?? slug;
    const confirmed = window.confirm(
      t("dashboard.unenrollConfirm", { title: courseTitle }),
    );
    if (!confirmed) return;
    setUnenrollingSlug(slug);
    try {
      await apiFetch(`/academy/courses/${encodeURIComponent(slug)}/enroll`, {
        method: "DELETE",
        locale,
      });
      setCourses((prev) => prev.filter((c) => c.slug !== slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUnenrollingSlug(null);
    }
  }

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider text-[color:var(--color-primary)]">
            {t("appName")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            {t("dashboard.title")}
          </h1>
        </header>

        {loading ? (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">…</p>
        ) : error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[color:var(--color-border)] p-8 text-center">
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {t("dashboard.emptyIntro")}
            </p>
            <Link
              href="/catalog"
              className="mt-3 inline-block text-sm font-medium text-[color:var(--color-primary)] underline"
            >
              {t("dashboard.emptyBrowseCatalog")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                locale={locale}
                onUnenroll={onUnenroll}
                unenrollPending={unenrollingSlug === course.slug}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
