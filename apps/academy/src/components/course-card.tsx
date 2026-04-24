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
};

interface CourseCardProps {
  course: CourseSummary;
  locale: string;
  /** Show the `Public` badge (catalog view); omitted on the enrolled dashboard. */
  showVisibilityBadge?: boolean;
}

export function CourseCard({
  course,
  locale,
  showVisibilityBadge = false,
}: CourseCardProps) {
  const t = useTranslations("Academy");
  return (
    <Link
      href={{ pathname: "/courses/[slug]", params: { slug: course.slug } }}
      className="group block rounded-lg border border-[color:var(--color-border)] p-6 transition hover:border-[color:var(--color-primary)] hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold group-hover:text-[color:var(--color-primary)]">
          {pickLocalized(course.title, locale)}
        </h2>
        {showVisibilityBadge && course.visibility === "public" ? (
          <span className="shrink-0 rounded-sm border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-primary)]">
            {t("visibilities.public")}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)] line-clamp-3">
        {pickLocalized(course.description, locale)}
      </p>
      <p className="mt-4 text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        {course.lessonCount} {t("course.lessonsTitle").toLowerCase()}
      </p>
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
