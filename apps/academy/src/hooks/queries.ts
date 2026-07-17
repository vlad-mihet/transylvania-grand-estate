"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, useAccessToken } from "@/lib/api-client";
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
  // Slug of the first published lesson — fallback when no resume exists.
  firstLessonSlug: string | null;
  progress: {
    totalLessons: number;
    completedLessons: number;
    lastSeenAt: string | null;
    resumeLessonSlug: string | null;
    // 1-based position of the resume lesson in the published list.
    // Used to auto-jump the TOC to the page containing the lesson.
    resumeLessonPosition: number | null;
  };
  servedLocale: string;
  localizedTitle: string;
  localizedDescription: string;
};

export type CourseLessonRow = {
  id: string;
  slug: string;
  order: number;
  position: number;
  title: Record<string, string | undefined>;
  excerpt: Record<string, string | undefined>;
  type: "text" | "video";
  readingTimeMinutes: number | null;
  videoDurationSeconds: number | null;
  publishedAt: string | null;
  completed: boolean;
  servedLocale: string;
  localizedTitle: string;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type CourseLessonsPage = {
  data: CourseLessonRow[];
  meta: PaginationMeta & {
    // Total published lessons in the course regardless of search filter.
    coursePublishedTotal: number;
  };
};

type LessonNeighbour = { slug: string; localizedTitle: string } | null;

export type LessonAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  sortOrder: number;
  createdAt: string;
};

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
  attachments: LessonAttachment[];
};

/**
 * Returns `false` on the server and during the first client render, then
 * flips to `true` after mount. Used as the SSR-safe gate on queries whose
 * `enabled` predicate would otherwise read `localStorage` (token presence)
 * and produce a different `isLoading` between SSR and hydration — which
 * blows up any component that bakes `isLoading` into a className or other
 * hydration-relevant attribute (e.g. AppHeader's avatar `animate-pulse`).
 */
function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);
  // Canonical SSR-safe "have we hydrated yet" flag: it MUST start false on the
  // server + first client render and flip true only after mount, so this can't
  // move to render-time without defeating its purpose. Runs once.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setIsClient(true), []);
  return isClient;
}

export function useMe() {
  const isClient = useIsClient();
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: qk.me(),
    queryFn: () => apiFetch<Profile>("/academy/auth/me"),
    enabled: isClient && !!accessToken,
  });
}

export function useMyCourses(locale: string) {
  const isClient = useIsClient();
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: qk.myCourses(locale),
    queryFn: () => apiFetch<CourseSummary[]>("/academy/courses", { locale }),
    enabled: isClient && !!accessToken,
  });
}

export function useCatalog(locale: string, page: number, search: string) {
  const isClient = useIsClient();
  const accessToken = useAccessToken();
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (search) params.set("search", search);
  return useQuery({
    queryKey: qk.catalog(locale, page, search),
    queryFn: () =>
      apiFetch<Paginated<CourseSummary>>(
        `/academy/courses/catalog?${params.toString()}`,
        { locale },
      ),
    enabled: isClient && !!accessToken,
    // Keep the previous page visible while the next page loads — no
    // jarring loading flash between page numbers.
    placeholderData: (prev) => prev,
  });
}

export function useCourse(slug: string, locale: string) {
  const isClient = useIsClient();
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: qk.course(slug, locale),
    queryFn: () =>
      apiFetch<CourseDetail>(
        `/academy/courses/${encodeURIComponent(slug)}?locale=${locale}`,
        { locale },
      ),
    enabled: isClient && !!accessToken && !!slug,
  });
}

export function useCourseLessons(
  slug: string,
  locale: string,
  page: number,
  search: string,
  limit = 20,
) {
  const isClient = useIsClient();
  const accessToken = useAccessToken();
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search) params.set("search", search);
  params.set("locale", locale);
  return useQuery({
    queryKey: qk.courseLessons(slug, locale, page, search),
    queryFn: () =>
      apiFetch<CourseLessonsPage>(
        `/academy/courses/${encodeURIComponent(slug)}/lessons?${params.toString()}`,
        { locale },
      ),
    enabled: isClient && !!accessToken && !!slug,
    placeholderData: (prev) => prev,
  });
}

export function useLesson(slug: string, lessonSlug: string, locale: string) {
  const isClient = useIsClient();
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: qk.lesson(slug, lessonSlug, locale),
    queryFn: () =>
      apiFetch<LessonDetail>(
        `/academy/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonSlug)}?locale=${locale}`,
        { locale },
      ),
    enabled: isClient && !!accessToken && !!slug && !!lessonSlug,
  });
}
