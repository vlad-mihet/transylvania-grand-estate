"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { academyKeys } from "./query-keys";
import type { AcademyCourseSummary } from "../types";

const invalidateCourseLists = (
  qc: ReturnType<typeof useQueryClient>,
  id?: string,
) => {
  void qc.invalidateQueries({ queryKey: academyKeys.courses() });
  void qc.invalidateQueries({ queryKey: ["academy-courses"] });
  if (id) {
    void qc.invalidateQueries({ queryKey: academyKeys.course(id) });
  }
};

/**
 * Single-course detail. Disabled until an `id` is provided. Generic over the
 * return type so pages that need the richer admin shape (including `draft`,
 * `coverImage`, etc.) can pass their own type — the base
 * `AcademyCourseSummary` is the default for callers that don't care.
 */
export function useAcademyCourse<T = AcademyCourseSummary>(
  id: string | null | undefined,
) {
  return useQuery({
    queryKey: id ? academyKeys.course(id) : academyKeys.courses(),
    queryFn: () => apiClient<T>(`/admin/academy/courses/${id}`),
    enabled: !!id,
  });
}

/** Pre-delete impact check: how many lessons & active enrollments will be hit. */
export function useCourseDeleteImpact(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? academyKeys.courseDeleteImpact(id) : academyKeys.courses(),
    queryFn: () =>
      apiClient<{ lessonCount: number; activeEnrollmentCount: number }>(
        `/admin/academy/courses/${id}/delete-impact`,
      ),
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiClient<AcademyCourseSummary>("/admin/academy/courses", {
        method: "POST",
        body,
      }),
    onSuccess: () => invalidateCourseLists(qc),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      apiClient<AcademyCourseSummary>(`/admin/academy/courses/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: (_data, { id }) => invalidateCourseLists(qc, id),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/academy/courses/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateCourseLists(qc),
  });
}

export function useDuplicateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: unknown }) =>
      apiClient<{ id: string }>(`/admin/academy/courses/${id}/duplicate`, {
        method: "POST",
        body,
      }),
    onSuccess: () => invalidateCourseLists(qc),
  });
}

/** Multipart cover-image upload for a freshly-created course. */
export function useUploadCourseCover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      fd.append("image", file);
      return apiClient(`/admin/academy/courses/${id}/cover-image`, {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: (_data, { id }) => invalidateCourseLists(qc, id),
  });
}
