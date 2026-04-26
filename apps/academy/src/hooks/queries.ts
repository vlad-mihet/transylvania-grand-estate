"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, getAccessToken } from "@/lib/api-client";
import { qk } from "./query-keys";
import type { CourseSummary } from "@/components/course-card";

export type Profile = {
  id: string;
  email: string;
  name: string;
  locale: "ro" | "en" | "fr" | "de" | null;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type CourseDetail = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  description: Record<string, string | undefined>;
  coverImage: string | null;
  publishedAt: string | null;
  visibility: "public" | "enrolled";
  enrolled: boolean;
  canUnenroll?: boolean;
  progress: {
    totalLessons: number;
    completedLessons: number;
    lastSeenAt: string | null;
    resumeLessonSlug: string | null;
  };
  servedLocale: string;
  localizedTitle: string;
  localizedDescription: string;
  lessons: Array<{
    id: string;
    slug: string;
    order: number;
    title: Record<string, string | undefined>;
    excerpt: Record<string, string | undefined>;
    type: "text" | "video";
    readingTimeMinutes: number | null;
    videoDurationSeconds: number | null;
    publishedAt: string | null;
    completed: boolean;
  }>;
};

type LessonNeighbour = { slug: string; localizedTitle: string } | null;

export type LessonDetail = {
  id: string;
  slug: string;
  order: number;
  title: Record<string, string | undefined>;
  excerpt: Record<string, string | undefined>;
  type: "text" | "video";
  readingTimeMinutes: number | null;
  videoDurationSeconds: number | null;
  publishedAt: string | null;
  videoUrl: string | null;
  content: string;
  servedLocale: string;
  localizedTitle: string;
  localizedExcerpt: string;
  completed: boolean;
  completedAt: string | null;
  prev: LessonNeighbour;
  next: LessonNeighbour;
};

export function useMe() {
  return useQuery({
    queryKey: qk.me(),
    queryFn: () => apiFetch<Profile>("/academy/auth/me"),
    enabled: typeof window !== "undefined" && !!getAccessToken(),
  });
}

export function useMyCourses(locale: string) {
  return useQuery({
    queryKey: qk.myCourses(locale),
    queryFn: () => apiFetch<CourseSummary[]>("/academy/courses", { locale }),
    enabled: typeof window !== "undefined" && !!getAccessToken(),
  });
}

export function useCatalog(locale: string) {
  return useQuery({
    queryKey: qk.catalog(locale),
    queryFn: () =>
      apiFetch<CourseSummary[]>("/academy/courses/catalog", { locale }),
    enabled: typeof window !== "undefined" && !!getAccessToken(),
  });
}

export function useCourse(slug: string, locale: string) {
  return useQuery({
    queryKey: qk.course(slug, locale),
    queryFn: () =>
      apiFetch<CourseDetail>(
        `/academy/courses/${encodeURIComponent(slug)}?locale=${locale}`,
        { locale },
      ),
    enabled:
      typeof window !== "undefined" && !!getAccessToken() && !!slug,
  });
}

export function useLesson(slug: string, lessonSlug: string, locale: string) {
  return useQuery({
    queryKey: qk.lesson(slug, lessonSlug, locale),
    queryFn: () =>
      apiFetch<LessonDetail>(
        `/academy/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonSlug)}?locale=${locale}`,
        { locale },
      ),
    enabled:
      typeof window !== "undefined" &&
      !!getAccessToken() &&
      !!slug &&
      !!lessonSlug,
  });
}
