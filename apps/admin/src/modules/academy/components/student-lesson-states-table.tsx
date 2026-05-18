"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { LoadingState } from "@tge/ui";
import { apiClient } from "@/lib/api-client";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { pickTitle } from "@/modules/academy";
import { cn } from "@tge/utils";

type LessonState = {
  lessonId: string;
  slug: string;
  title: Record<string, string | undefined>;
  order: number;
  status: "draft" | "published" | "archived";
  startedAt: string | null;
  completedAt: string | null;
  lastSeenAt: string | null;
};

type State = "completed" | "in_progress" | "not_started";

function deriveState(row: LessonState): State {
  if (row.completedAt) return "completed";
  if (row.startedAt || row.lastSeenAt) return "in_progress";
  return "not_started";
}

const stateDot: Record<State, string> = {
  completed: "bg-[var(--color-success)]",
  in_progress: "bg-[var(--color-warning)]",
  not_started: "bg-muted-foreground/40",
};

interface Props {
  studentId: string;
  courseId: string;
}

/**
 * Lazy-loaded inside the per-course progress disclosure on the student
 * detail page. One row per published lesson with completion state,
 * lastSeen, and (when applicable) a relative-time stamp for
 * `completedAt`. The course's lesson sequence is preserved so an admin
 * can scan top-to-bottom and see where the student stalled.
 */
export function StudentLessonStatesTable({ studentId, courseId }: Props) {
  const locale = useLocale();
  const t = useTranslations("Academy.studentProgress");

  const query = useQuery({
    queryKey: ["academy-student-lessons", studentId, courseId],
    queryFn: () =>
      apiClient<LessonState[]>(
        `/admin/academy/users/${studentId}/courses/${courseId}/lessons`,
      ),
  });

  if (query.isLoading) {
    return <LoadingState label={t("lessonsLoading")} />;
  }
  if (query.isError || !query.data) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("lessonsLoadFailed")}
      </p>
    );
  }
  if (query.data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("lessonsEmpty")}</p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {query.data.map((row, idx) => {
        const state = deriveState(row);
        const title = pickTitle(row.title, row.slug, locale);
        return (
          <li
            key={row.lessonId}
            className="flex items-center gap-3 px-3 py-2 text-xs"
          >
            <Mono className="w-7 shrink-0 text-muted-foreground">
              {String(idx + 1).padStart(2, "0")}
            </Mono>
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                stateDot[state],
              )}
            />
            <span className="min-w-0 flex-1 truncate">{title}</span>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              {t(`lessonStatus_${state}`)}
            </span>
            {row.completedAt ? (
              <RelativeTime
                value={row.completedAt}
                className="text-[10px] text-muted-foreground"
              />
            ) : row.lastSeenAt ? (
              <RelativeTime
                value={row.lastSeenAt}
                className="text-[10px] text-muted-foreground"
              />
            ) : (
              <span className="w-8 shrink-0" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
