"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError, getAccessToken, clearTokens } from "@/lib/api-client";
import { AppHeader } from "@/components/app-header";
import { CourseCard, type CourseSummary } from "@/components/course-card";

/**
 * Public-course catalog. Any authenticated academy user can browse what's
 * flagged `visibility: public` on the API. Enrollment is not required — a
 * user with no grants still lands here with something to read.
 */
export default function CatalogPage() {
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
    apiFetch<CourseSummary[]>("/academy/courses/catalog", { locale })
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

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider text-[color:var(--color-primary)]">
            {t("appName")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            {t("catalog.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-muted-foreground)]">
            {t("catalog.subtitle")}
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">…</p>
        ) : error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            {t("catalog.empty")}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                locale={locale}
                showVisibilityBadge
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
