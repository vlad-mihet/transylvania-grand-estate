"use client";

import { useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { BookOpen } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useRegisterCommands } from "@/components/command-palette/dynamic-actions-context";
import type { CommandAction } from "@/components/command-palette/actions";
import { pickTitle } from "@/lib/academy/pick-title";

type Lesson = {
  id: string;
  slug: string;
  order: number;
  title: Record<string, string | undefined>;
};

type LessonList = { data: Lesson[]; meta: { total: number } };

/**
 * Course-scoped layout — registers the course's lessons as palette entries
 * (the `context` group) while the user is anywhere under
 * `/academy/courses/[id]/...`. Unmounting (navigating out of the course)
 * clears the registration. Doesn't render any chrome of its own.
 *
 * Reuses the same React Query key as the course detail page so the cache
 * is shared and we don't re-fetch.
 */
export default function CourseScopedLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const locale = useLocale();

  const lessonsQuery = useQuery({
    queryKey: ["academy-lessons", params.id],
    queryFn: () =>
      apiClient<LessonList>(
        `/admin/academy/courses/${params.id}/lessons?limit=500&sort=order`,
        { envelope: true },
      ),
    enabled: Boolean(params.id),
  });

  const actions = useMemo<CommandAction[]>(() => {
    const data = lessonsQuery.data?.data ?? [];
    return data.map((lesson, idx) => {
      const title = pickTitle(lesson.title, lesson.slug, locale);
      const position = String(idx + 1).padStart(2, "0");
      return {
        id: `academy.lesson.${lesson.id}`,
        group: "context",
        icon: BookOpen,
        href: `/academy/courses/${params.id}/lessons/${lesson.id}/edit`,
        label: `${position}. ${title}`,
        keywords: [lesson.slug, "lesson", "lecție"],
        requires: "academy.lesson.update",
      } satisfies CommandAction;
    });
  }, [lessonsQuery.data, locale, params.id]);

  useRegisterCommands(`course:${params.id}:lessons`, actions);

  return <>{children}</>;
}
