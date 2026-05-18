"use client";

import { useLocale, useTranslations } from "next-intl";
import { LoadingState } from "@tge/ui";
import { CheckCircle2, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { RelativeTime } from "@/components/shared/relative-time";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { AcademyProgressBar } from "@/modules/academy/components/academy-progress-bar";
import { pickTitle, useAcademyOverview } from "@/modules/academy";

export default function AcademyOverviewPage() {
  const locale = useLocale();
  const t = useTranslations("Academy.overview");
  const tc = useTranslations("Common");

  const overviewQuery = useAcademyOverview();

  if (overviewQuery.isLoading) {
    return <LoadingState label={tc("loading")} />;
  }
  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
    );
  }
  const data = overviewQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={t("mau30d")}
          value={data.mau30d}
          caption={t("mau30dCaption")}
        />
        <StatTile
          label={t("activeEnrollments")}
          value={data.activeEnrollments}
          caption={t("activeEnrollmentsCaption")}
        />
        <StatTile
          label={t("newStudentsLast7d")}
          value={data.newStudentsLast7d}
          tone={data.newStudentsLast7d > 0 ? "success" : "default"}
          caption={t("newStudentsLast7dCaption")}
        />
        <StatTile
          label={t("pendingInvitations")}
          value={data.pendingInvitations}
          tone={data.pendingInvitations > 0 ? "warning" : "default"}
          caption={
            <Link
              href="/academy/invitations"
              className="hover:text-foreground hover:underline"
            >
              {t("pendingInvitationsLink")}
            </Link>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title={t("topCoursesTitle")}
          description={t("topCoursesDescription")}
        >
          {data.topCoursesByCompletion.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("topCoursesEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {data.topCoursesByCompletion.map((c) => {
                const title = pickTitle(c.title, c.slug, locale);
                return (
                  <li key={c.courseId} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/academy/courses/${c.courseId}`}
                        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                      >
                        {title}
                      </Link>
                      <Mono className="shrink-0 text-[11px] text-muted-foreground">
                        {c.completionRate}%
                      </Mono>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <AcademyProgressBar
                        completed={c.completedCount}
                        total={Math.max(c.enrolledCount, c.completedCount, 1)}
                        className="flex-1"
                        hideCount
                      />
                      <Mono className="shrink-0 text-[10px] text-muted-foreground">
                        {t("completionsOf", {
                          completed: c.completedCount,
                          enrolled: c.enrolledCount,
                        })}
                      </Mono>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={t("recentActivityTitle")}
          description={t("recentActivityDescription")}
        >
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("recentActivityEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {data.recentActivity.map((row, idx) => {
                const Icon = row.kind === "completed" ? CheckCircle2 : Play;
                const courseTitle = pickTitle(
                  row.courseTitle,
                  row.courseSlug,
                  locale,
                );
                return (
                  <li
                    key={`${row.studentId}-${row.lessonId}-${idx}`}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs"
                  >
                    <Icon
                      className={
                        row.kind === "completed"
                          ? "h-3.5 w-3.5 shrink-0 text-[var(--color-success)]"
                          : "h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      }
                    />
                    <Link
                      href={`/academy/students/${row.studentId}`}
                      className="shrink-0 truncate font-medium hover:underline"
                    >
                      {row.studentName}
                    </Link>
                    <span className="text-muted-foreground">
                      {t(
                        row.kind === "completed"
                          ? "activityCompleted"
                          : "activityStarted",
                      )}
                    </span>
                    <Link
                      href={`/academy/courses/${row.courseId}`}
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      {courseTitle}
                    </Link>
                    <RelativeTime
                      value={row.at}
                      className="text-[10px] text-muted-foreground"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
