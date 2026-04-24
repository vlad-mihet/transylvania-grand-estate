"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

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
};

interface CourseCardProps {
  course: CourseSummary;
  locale: string;
  /** Show the `Public` badge (catalog view); omitted on the enrolled dashboard. */
  showVisibilityBadge?: boolean;
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
  onUnenroll,
  unenrollPending,
}: CourseCardProps) {
  const t = useTranslations("Academy");
  const showEnrolledBadge =
    showVisibilityBadge && course.visibility === "public" && course.enrolled;
  const showPublicBadge =
    showVisibilityBadge && course.visibility === "public" && !course.enrolled;
  const canShowUnenroll = !!onUnenroll && !!course.canUnenroll;

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
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          {course.lessonCount} {t("course.lessonsTitle").toLowerCase()}
        </p>
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
    </Link>
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
