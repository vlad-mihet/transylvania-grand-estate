"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

export type CourseSummary = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  description: Record<string, string | undefined>;
  coverImage: string | null;
  lessonCount: number;
  order: number;
  publishedAt: string | null;
  visibility: "public" | "enrolled";
  enrolled: boolean;
  /**
   * Only true when the student's enrollment is a self-service, per-course
   * row. Admin grants and wildcards return false — the student can't
   * unilaterally drop those.
   */
  canUnenroll?: boolean;
  /**
   * Per-student progress summary. Dashboard cards always have this; catalog
   * cards have it too but the UI usually hides progress bars there to keep
   * browsing visually clean.
   */
  progress?: {
    totalLessons: number;
    completedLessons: number;
    lastSeenAt: string | null;
    resumeLessonSlug: string | null;
  };
};

interface CourseCardProps {
  course: CourseSummary;
  locale: string;
  /** Show the `Public` badge (catalog view); omitted on the enrolled dashboard. */
  showVisibilityBadge?: boolean;
  /** Render the progress bar + Continuă CTA. Defaults to true on dashboard, false on catalog. */
  showProgress?: boolean;
  /**
   * When provided, the card renders a small "Elimină" affordance the student
   * can use to drop the course from their dashboard. Only fires when
   * `course.canUnenroll` is true; the parent owns confirmation + mutation.
   */
  onUnenroll?: (slug: string) => void;
  /** When true, the unenroll button is disabled (pending mutation). */
  unenrollPending?: boolean;
}

export function CourseCard({
  course,
  locale,
  showVisibilityBadge = false,
  showProgress = false,
  onUnenroll,
  unenrollPending,
}: CourseCardProps) {
  const t = useTranslations("Academy");
  const showEnrolledBadge =
    showVisibilityBadge && course.visibility === "public" && course.enrolled;
  const showPublicBadge =
    showVisibilityBadge && course.visibility === "public" && !course.enrolled;
  const canShowUnenroll = !!onUnenroll && !!course.canUnenroll;
  const progress = course.progress;
  const hasProgress =
    showProgress && !!progress && progress.totalLessons > 0;
  const isStarted = !!progress?.lastSeenAt;
  const allDone =
    !!progress &&
    progress.totalLessons > 0 &&
    progress.completedLessons >= progress.totalLessons;
  const percent = hasProgress
    ? Math.round((progress!.completedLessons / progress!.totalLessons) * 100)
    : 0;

  return (
    <Link
      href={{ pathname: "/courses/[slug]", params: { slug: course.slug } }}
      className="group relative block rounded-lg border border-[color:var(--color-border)] p-6 transition hover:border-[color:var(--color-primary)] hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold group-hover:text-[color:var(--color-primary)]">
          {pickLocalized(course.title, locale)}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {showPublicBadge ? (
            <span className="rounded-sm border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-primary)]">
              {t("visibilities.public")}
            </span>
          ) : null}
          {showEnrolledBadge ? (
            <span className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-700">
              {t("course.enrolledBadge")}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)] line-clamp-3">
        {pickLocalized(course.description, locale)}
      </p>

      {hasProgress ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-[color:var(--color-muted-foreground)]">
              {t("course.progressLabel", {
                completed: progress!.completedLessons,
                total: progress!.totalLessons,
              })}
            </span>
            {allDone ? (
              <span className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-700">
                {t("course.allCompletedBadge")}
              </span>
            ) : null}
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--color-muted)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress!.totalLessons}
            aria-valuenow={progress!.completedLessons}
          >
            <div
              className="h-full rounded-full bg-[color:var(--color-primary)] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          {course.lessonCount} {t("course.lessonsTitle").toLowerCase()}
        </p>
        <div className="flex items-center gap-3">
          {hasProgress && progress!.resumeLessonSlug ? (
            <ResumeLink
              slug={course.slug}
              lessonSlug={progress!.resumeLessonSlug}
              label={
                allDone
                  ? t("course.reviewButton")
                  : isStarted
                    ? t("course.continueButton")
                    : t("course.startButton")
              }
            />
          ) : null}
          {canShowUnenroll ? (
            <button
              type="button"
              disabled={unenrollPending}
              onClick={(e) => {
                // Prevent Link navigation when the user clicks the remove
                // control — the card-as-link has to stay for the common case.
                e.preventDefault();
                e.stopPropagation();
                onUnenroll?.(course.slug);
              }}
              className="text-xs text-[color:var(--color-muted-foreground)] underline-offset-2 hover:text-red-600 hover:underline disabled:cursor-wait disabled:opacity-50"
            >
              {t("dashboard.unenrollAction")}
            </button>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function ResumeLink({
  slug,
  lessonSlug,
  label,
}: {
  slug: string;
  lessonSlug: string;
  label: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      // The card is wrapped in an <a> (Link); nesting another <a> is
      // invalid HTML. Use a button + imperative navigation with
      // preventDefault on the outer click so only the button handler
      // fires.
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push({
          pathname: "/courses/[slug]/[lessonSlug]",
          params: { slug, lessonSlug },
        });
      }}
      className="inline-flex items-center gap-1 rounded-md bg-[color:var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
    >
      {label}
    </button>
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
