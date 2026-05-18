"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { academyKeys } from "./query-keys";
import type {
  AcademyLessonDetail,
  AcademyLessonSummary,
  LessonList,
} from "../types";

const invalidateLessonLists = (
  qc: ReturnType<typeof useQueryClient>,
  courseId: string,
) => {
  void qc.invalidateQueries({ queryKey: academyKeys.lessons(courseId) });
  void qc.invalidateQueries({
    queryKey: [`academy-lessons-${courseId}`],
  });
};

/**
 * All lessons in a course, ordered. Backs the course-detail lesson rail and
 * the lesson prev/next navigation — neither paginates, so we fetch with a
 * high limit and let the API cap if needed. Returns the envelope so callers
 * can read `meta.total` for "X of Y" labels.
 */
export function useAcademyAllLessons(courseId: string) {
  return useQuery({
    queryKey: [...academyKeys.lessons(courseId), "all"] as const,
    queryFn: () =>
      apiClient<LessonList>(
        `/admin/academy/courses/${courseId}/lessons?limit=500&sort=order`,
        { envelope: true },
      ),
    enabled: !!courseId,
  });
}

/**
 * Single-lesson detail. Generic over the return type so pages that need the
 * richer admin shape (siblings, attachments, etc.) can pass their own type.
 */
export function useAcademyLesson<T = AcademyLessonDetail>(
  courseId: string,
  lessonId: string | null | undefined,
) {
  return useQuery({
    queryKey: lessonId
      ? academyKeys.lesson(courseId, lessonId)
      : academyKeys.lessons(courseId),
    queryFn: () =>
      apiClient<T>(
        `/admin/academy/courses/${courseId}/lessons/${lessonId}`,
      ),
    enabled: !!courseId && !!lessonId,
  });
}

/** Next available `order` value for a new lesson in this course. */
export function useLessonNextOrder(courseId: string) {
  return useQuery({
    queryKey: academyKeys.lessonNextOrder(courseId),
    queryFn: () =>
      apiClient<{ order: number }>(
        `/admin/academy/courses/${courseId}/lessons/next-order`,
      ),
    enabled: !!courseId,
  });
}

export function useCreateLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiClient<AcademyLessonSummary>(
        `/admin/academy/courses/${courseId}/lessons`,
        { method: "POST", body },
      ),
    onSuccess: () => {
      invalidateLessonLists(qc, courseId);
      void qc.invalidateQueries({
        queryKey: academyKeys.lessonNextOrder(courseId),
      });
    },
  });
}

export function useUpdateLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, body }: { lessonId: string; body: unknown }) =>
      apiClient<AcademyLessonSummary>(
        `/admin/academy/courses/${courseId}/lessons/${lessonId}`,
        { method: "PATCH", body },
      ),
    onSuccess: (_data, { lessonId }) => {
      void qc.invalidateQueries({
        queryKey: academyKeys.lesson(courseId, lessonId),
      });
      invalidateLessonLists(qc, courseId);
    },
  });
}

export function useDeleteLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) =>
      apiClient(
        `/admin/academy/courses/${courseId}/lessons/${lessonId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => invalidateLessonLists(qc, courseId),
  });
}

/** Move a lesson to a target global order within its course. Used by both
 * the lessons-table drag-and-drop and the "Move to position…" row action. */
export function useMoveLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { lessonId: string; targetOrder: number }) =>
      apiClient<{ ok: boolean; moved: 0 | 1 }>(
        `/admin/academy/courses/${courseId}/lessons/${input.lessonId}/move`,
        { method: "POST", body: { targetOrder: input.targetOrder } },
      ),
    onSuccess: () => invalidateLessonLists(qc, courseId),
  });
}

/**
 * Mint a short-lived preview token for a draft lesson. Used by the edit page
 * to open `/academy/preview/lessons/:id?token=...` in a new tab.
 */
export function useMintLessonPreviewToken(courseId: string) {
  return useMutation({
    mutationFn: (lessonId: string) =>
      apiClient<{ url: string; expiresAt: string }>(
        `/admin/academy/courses/${courseId}/lessons/${lessonId}/preview-token`,
        { method: "POST" },
      ),
  });
}

/**
 * Autosave draft fields to the lesson's draft column. Intentionally does NOT
 * invalidate any cache — the loaded form keeps its current values so the
 * user's typing isn't reset mid-edit.
 */
export function useAutosaveLesson(courseId: string, lessonId: string) {
  return useMutation({
    mutationFn: (body: unknown) =>
      apiClient<AcademyLessonSummary>(
        `/admin/academy/courses/${courseId}/lessons/${lessonId}`,
        { method: "PATCH", body },
      ),
  });
}
