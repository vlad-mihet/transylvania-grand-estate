"use client";

import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button, EmptyState, ErrorState } from "@tge/ui";
import { Link } from "@/i18n/navigation";
import { AppHeader } from "@/components/app-header";
import { CourseCard } from "@/components/course-card";
import { DashboardSkeleton } from "@/components/skeletons";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useMyCourses } from "@/hooks/queries";
import { useUnenroll } from "@/hooks/mutations";

export default function DashboardPage() {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const { isReady } = useAuthGuard();
  const query = useMyCourses(locale);
  const unenroll = useUnenroll();

  async function onUnenroll(slug: string) {
    const target = query.data?.find((c) => c.slug === slug);
    const courseTitle =
      target?.title[locale] ?? target?.title.ro ?? target?.slug ?? slug;
    const confirmed = window.confirm(
      t("dashboard.unenrollConfirm", { title: courseTitle }),
    );
    if (!confirmed) return;
    try {
      await unenroll.mutateAsync({ slug, locale });
      toast.success(t("dashboard.unenrollSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <AppHeader />
      {!isReady || query.isLoading ? (
        <DashboardSkeleton />
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
              {t("dashboard.title")}
            </h1>
          </header>
          {(query.data ?? []).length === 0 ? (
            <EmptyState
              title={t("dashboard.emptyIntro")}
              action={
                <Button
                  asChild
                  className="bg-[color:var(--color-primary)] text-white hover:bg-[color:var(--color-primary)]/90"
                >
                  <Link href="/catalog">
                    {t("dashboard.emptyBrowseCatalog")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {(query.data ?? []).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  locale={locale}
                  showProgress
                  onUnenroll={onUnenroll}
                  unenrollPending={
                    unenroll.isPending &&
                    unenroll.variables?.slug === course.slug
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
