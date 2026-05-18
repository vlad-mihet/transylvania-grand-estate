/**
 * Centralized React Query key factory for the Academy module. Use this in
 * every hook so cache invalidations stay consistent — mutations call
 * `queryClient.invalidateQueries({ queryKey: academyKeys.courses() })` instead
 * of stringly-typed `["academy", "courses"]` arrays scattered across files.
 */
export const academyKeys = {
  all: ["academy"] as const,
  overview: () => [...academyKeys.all, "overview"] as const,
  courses: () => [...academyKeys.all, "courses"] as const,
  course: (id: string) => [...academyKeys.courses(), id] as const,
  courseStats: (id: string) => [...academyKeys.course(id), "stats"] as const,
  courseDeleteImpact: (id: string) =>
    [...academyKeys.course(id), "delete-impact"] as const,
  lessons: (courseId: string) =>
    [...academyKeys.course(courseId), "lessons"] as const,
  lesson: (courseId: string, lessonId: string) =>
    [...academyKeys.lessons(courseId), lessonId] as const,
  lessonNextOrder: (courseId: string) =>
    [...academyKeys.lessons(courseId), "next-order"] as const,
  lessonAttachments: (lessonId: string) =>
    [...academyKeys.all, "lesson-attachments", lessonId] as const,
} as const;
