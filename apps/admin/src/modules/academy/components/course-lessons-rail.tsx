"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { Link } from "@/i18n/navigation";
import { Mono } from "@/components/shared/mono";
import { pickTitle } from "@/modules/academy";
import { cn } from "@tge/utils";

type Lesson = {
  id: string;
  slug: string;
  order: number;
  title: Record<string, string | undefined>;
  status: "draft" | "published" | "archived";
};

type LessonList = { data: Lesson[]; meta: { total: number } };

const statusDot: Record<Lesson["status"], string> = {
  published: "bg-[var(--color-success)]",
  draft: "bg-[var(--color-warning)]",
  archived: "bg-muted-foreground",
};

/**
 * Secondary rail for the lesson editor. Lists every lesson in the course
 * with the active one highlighted; clicking a row navigates to that
 * lesson's edit page. Cache key matches the course detail page so the
 * data is shared.
 */
export function CourseLessonsRail() {
  const params = useParams<{ id: string; lessonId?: string }>();
  const locale = useLocale();
  const t = useTranslations("Academy.lessons");

  const lessonsQuery = useQuery({
    queryKey: ["academy-lessons", params.id],
    queryFn: () =>
      apiClient<LessonList>(
        `/admin/academy/courses/${params.id}/lessons?limit=500&sort=order`,
        { envelope: true },
      ),
    enabled: Boolean(params.id),
  });

  // Scroll the active row into view on mount + when the active lesson
  // changes (prev/next navigation). Done via DOM query because next-intl's
  // typed Link doesn't forward refs.
  useEffect(() => {
    if (!params.lessonId) return;
    const el = document.querySelector<HTMLAnchorElement>(
      `[data-rail-lesson="${params.lessonId}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [params.lessonId]);

  const lessons = lessonsQuery.data?.data ?? [];
  const total = lessons.length;

  return (
    <nav
      aria-label={t("railHeading")}
      className="hidden lg:block lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-64 lg:overflow-y-auto"
    >
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("railHeading")}
        </span>
        <Mono className="text-[10px] text-muted-foreground">
          {String(total).padStart(2, "0")}
        </Mono>
      </div>

      {lessonsQuery.isLoading ? (
        <div className="space-y-1 px-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-sm bg-muted"
            />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="px-2 text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <ol className="space-y-0.5">
          {lessons.map((lesson, idx) => {
            const active = lesson.id === params.lessonId;
            const title = pickTitle(lesson.title, lesson.slug, locale);
            return (
              <li key={lesson.id}>
                <Link
                  href={`/academy/courses/${params.id}/lessons/${lesson.id}/edit`}
                  data-rail-lesson={lesson.id}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      statusDot[lesson.status],
                    )}
                  />
                  <Mono className="w-6 shrink-0 text-[10px] text-muted-foreground">
                    {String(idx + 1).padStart(2, "0")}
                  </Mono>
                  <span className="truncate">{title}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
