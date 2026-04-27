"use client";

import { useRef } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, ErrorState } from "@tge/ui";
import { AppHeader } from "@/components/app-header";
import { CourseCard } from "@/components/course-card";
import { Pagination } from "@/components/pagination";
import { CatalogSkeleton } from "@/components/skeletons";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useCatalog } from "@/hooks/queries";

const PAGE_PARAM = "page";

/**
 * Public-course catalog. Any authenticated academy user can browse what's
 * flagged `visibility: public` on the API. Enrollment is not required — a
 * user with no grants still lands here with something to read.
 *
 * Paginated server-side (default 12 per page). Page lives in the URL via
 * `?page=N` so refreshing or sharing a link preserves the position.
 */
export default function CatalogPage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isReady } = useAuthGuard();

  const pageParam = Number(searchParams.get(PAGE_PARAM) ?? 1);
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;

  const query = useCatalog(locale, page, "");
  const gridRef = useRef<HTMLDivElement | null>(null);

  const onPageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 1) params.delete(PAGE_PARAM);
    else params.set(PAGE_PARAM, String(next));
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <>
      <AppHeader />
      {!isReady || (query.isLoading && !query.data) ? (
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
          {(query.data?.data.length ?? 0) === 0 ? (
            <EmptyState title={t("catalog.empty")} />
          ) : (
            <>
              <div
                ref={gridRef}
                className="grid gap-6 sm:grid-cols-2"
                aria-busy={query.isFetching}
              >
                {(query.data?.data ?? []).map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    locale={locale}
                    showVisibilityBadge
                  />
                ))}
              </div>
              {query.data ? (
                <div className="mt-10">
                  <Pagination
                    page={query.data.meta.page}
                    totalPages={query.data.meta.totalPages}
                    total={query.data.meta.total}
                    limit={query.data.meta.limit}
                    onPageChange={onPageChange}
                    scrollTargetRef={gridRef}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </>
  );
}
