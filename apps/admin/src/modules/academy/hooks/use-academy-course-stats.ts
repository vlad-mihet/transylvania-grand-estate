"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { academyKeys } from "./query-keys";
import type { AcademyCourseStats } from "../types";

/**
 * Aggregated stats for a single course (enrollments, completions, per-lesson
 * completion distribution). Generic over the return type — the admin detail
 * page wants a slightly different shape than the SoT `AcademyCourseStats`.
 */
export function useAcademyCourseStats<T = AcademyCourseStats>(
  courseId: string,
) {
  return useQuery({
    queryKey: academyKeys.courseStats(courseId),
    queryFn: () =>
      apiClient<T>(`/admin/academy/courses/${courseId}/stats`),
    enabled: !!courseId,
  });
}
