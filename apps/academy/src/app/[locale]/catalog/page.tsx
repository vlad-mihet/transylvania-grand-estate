"use client";

import { useLocale, useTranslations } from "next-intl";
import { EmptyState, ErrorState } from "@tge/ui";
import { AppHeader } from "@/components/app-header";
import { CourseCard } from "@/components/course-card";
import { CatalogSkeleton } from "@/components/skeletons";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useCatalog } from "@/hooks/queries";

/**
 * Public-course catalog. Any authenticated academy user can browse what's
 * flagged `visibility: public` on the API. Enrollment is not required — a
 * user with no grants still lands here with something to read.
 */
export default function CatalogPage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const { isReady } = useAuthGuard();
  const query = useCatalog(locale);

  return (
    <>
      <AppHeader />
      {!isReady || query.isLoading ? (
        <CatalogSkeleton />
      ) : query.error ? (
        <div className="mx-auto max-w-5xl px-6 py-12">
          <ErrorState
            title={t("errors.generic")}
            description={query.error.message}
            onRetry={() => query.refetch()}
            retryLabel={t("errors.retry")}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-5xl px-6 py-12">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("catalog.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-muted-foreground)]">
              {t("catalog.subtitle")}
            </p>
          </header>
          {(query.data ?? []).length === 0 ? (
            <EmptyState title={t("catalog.empty")} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {(query.data ?? []).map((course) => (
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
      )}
    </>
  );
}
