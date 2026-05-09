"use client";

import { useState } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  LoadingState,
} from "@tge/ui";
import { Copy, Plus, Search } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { Mono } from "@/components/shared/mono";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { LessonsTable, type LessonsTableLesson } from "@/components/academy/lessons-table";
import { AcademyProgressBar } from "@/components/academy/academy-progress-bar";
import { pickTitle } from "@/lib/academy/pick-title";

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  description: Record<string, string | undefined>;
  status: "draft" | "published" | "archived";
  visibility: "public" | "enrolled";
  order: number;
  publishedAt: string | null;
  _count: { lessons: number };
};

type LessonList = { data: LessonsTableLesson[]; meta: { total: number } };

type CourseStats = {
  enrolledCount: number;
  startedCount: number;
  completedCount: number;
  completionRate: number;
  avgDaysToFirstCompletion: number | null;
  totalPublishedLessons: number;
  lessonCompletionDistribution: Array<{
    lessonId: string;
    slug: string;
    completedCount: number;
  }>;
};

export default function AcademyCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("Academy.courses");
  const tLessons = useTranslations("Academy.lessons");
  const tStatus = useTranslations("Academy.statuses");
  const tVisibility = useTranslations("Academy.visibilities");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");
  const tStats = useTranslations("Academy.courseStats");

  const courseQuery = useQuery({
    queryKey: ["academy-course", params.id],
    queryFn: () => apiClient<Course>(`/admin/academy/courses/${params.id}`),
  });

  const lessonsQuery = useQuery({
    queryKey: ["academy-lessons", params.id],
    queryFn: () =>
      apiClient<LessonList>(
        // limit=500 matches queryLessonSchema's cap; the reorder endpoint
        // requires the entire course's lesson list in one shot, so any
        // pagination here would silently break drag-and-drop on large
        // courses (e.g. real-estate-fundamentals at 180+ lessons).
        `/admin/academy/courses/${params.id}/lessons?limit=500&sort=order`,
        { envelope: true },
      ),
  });

  const statsQuery = useQuery({
    queryKey: ["academy-course-stats", params.id],
    queryFn: () =>
      apiClient<CourseStats>(`/admin/academy/courses/${params.id}/stats`),
  });

  const [searchQuery, setSearchQuery] = useState("");

  const publishMutation = useMutation({
    mutationFn: () =>
      apiClient(`/admin/academy/courses/${params.id}`, {
        method: "PATCH",
        body: {
          status:
            courseQuery.data?.status === "published" ? "draft" : "published",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-course", params.id] });
      queryClient.invalidateQueries({ queryKey: ["academy-courses"] });
      toast.success(tt("courseStatusUpdated"));
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("courseStatusFailed"),
      ),
  });

  const reorderMutation = useMutation({
    mutationFn: (lessonIds: string[]) =>
      apiClient<{ ok: boolean; reordered: number }>(
        `/admin/academy/courses/${params.id}/lessons/reorder`,
        { method: "POST", body: { lessonIds } },
      ),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["academy-lessons", params.id],
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : tt("lessonReorderFailed"),
      );
    },
  });

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateSlug, setDuplicateSlug] = useState("");
  const [duplicateCopyLessons, setDuplicateCopyLessons] = useState(true);
  const duplicateMutation = useMutation({
    mutationFn: () =>
      apiClient<{ id: string }>(
        `/admin/academy/courses/${params.id}/duplicate`,
        {
          method: "POST",
          body: {
            slug: duplicateSlug.trim(),
            copyLessons: duplicateCopyLessons,
          },
        },
      ),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["academy-courses"] });
      toast.success(tt("courseDuplicated"));
      setDuplicateOpen(false);
      setDuplicateSlug("");
      router.push(`/${locale}/academy/courses/${created.id}/edit`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("courseDuplicateFailed"),
      ),
  });

  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/academy/courses/${params.id}/lessons/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["academy-lessons", params.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["academy-course", params.id],
      });
      toast.success(tt("lessonDeleted"));
      setDeleteLessonId(null);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("lessonDeleteFailed"),
      ),
  });

  if (courseQuery.isLoading) {
    return <LoadingState label={tc("loading")} />;
  }
  if (courseQuery.isError) {
    const err = courseQuery.error;
    if (err instanceof ApiError && err.status === 404) notFound();
  }
  if (!courseQuery.data) {
    notFound();
  }

  const course = courseQuery.data;
  const title = pickTitle(course.title, course.slug, locale);
  const description =
    course.description[locale] ?? course.description.ro ?? "";
  const lessons = lessonsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={t("detailSummary", {
          lessonCount: lessons.length,
          status: tStatus(course.status),
          visibility: tVisibility(course.visibility),
        })}
        breadcrumb={
          <Link
            href="/academy/courses"
            className="hover:text-foreground hover:underline"
          >
            {t("detailBackToList")}
          </Link>
        }
        actions={
          <Can action="academy.course.update">
            <Button
              variant="outline"
              size="sm"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {course.status === "published"
                ? t("unpublishAction")
                : t("publishAction")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDuplicateOpen(true)}
            >
              <Copy className="mr-1.5 h-4 w-4" />
              {t("duplicateAction")}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/academy/courses/${course.id}/edit`}>
                {t("editAction")}
              </Link>
            </Button>
          </Can>
        }
      />

      {description ? (
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      ) : null}

      <SectionCard
        title={tStats("title")}
        description={tStats("description")}
        headerActions={
          <Can action="academy.user.manage">
            <ExportCsvButton
              path={`/admin/academy/courses/${course.id}/enrollments.csv`}
              label={tStats("exportEnrollments")}
              variant="ghost"
            />
            <ExportCsvButton
              path={`/admin/academy/courses/${course.id}/progress.csv`}
              label={tStats("exportProgress")}
              variant="ghost"
            />
          </Can>
        }
      >
        {statsQuery.isLoading ? (
          <LoadingState label={tc("loading")} />
        ) : statsQuery.isError || !statsQuery.data ? (
          <p className="text-sm text-muted-foreground">
            {tStats("loadFailed")}
          </p>
        ) : (
          <CourseStatsContent stats={statsQuery.data} />
        )}
      </SectionCard>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{tLessons("heading")}</h2>
        <Can action="academy.lesson.create">
          <Button asChild size="sm">
            <Link href={`/academy/courses/${course.id}/lessons/new`}>
              <Plus className="mr-1.5 h-4 w-4" />
              {tLessons("newLabel")}
            </Link>
          </Button>
        </Can>
      </div>

      <p className="-mt-4 text-xs text-muted-foreground">{tLessons("hint")}</p>

      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={tLessons("searchPlaceholder")}
          className="h-8 pl-8 text-sm"
          aria-label={tLessons("searchPlaceholder")}
        />
      </div>

      <LessonsTable
        lessons={lessons}
        searchQuery={searchQuery}
        courseId={course.id}
        isLoading={lessonsQuery.isLoading}
        onReorder={(ids) => reorderMutation.mutate(ids)}
        onDelete={(id) => setDeleteLessonId(id)}
      />

      <DeleteDialog
        open={!!deleteLessonId}
        onOpenChange={() => setDeleteLessonId(null)}
        onConfirm={() =>
          deleteLessonId && deleteLessonMutation.mutate(deleteLessonId)
        }
        title={tLessons("deleteTitle")}
        description={tLessons("deleteDescription")}
        loading={deleteLessonMutation.isPending}
      />

      <Dialog
        open={duplicateOpen}
        onOpenChange={(open) => {
          if (!open) setDuplicateSlug("");
          setDuplicateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("duplicateTitle")}</DialogTitle>
            <DialogDescription>{t("duplicateDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="duplicate-slug">
                {t("duplicateSlugLabel")}
              </Label>
              <Input
                id="duplicate-slug"
                value={duplicateSlug}
                onChange={(e) => setDuplicateSlug(e.target.value)}
                placeholder={`${course.slug}-copy`}
                className="mt-1.5 font-mono"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("duplicateSlugHelper")}
              </p>
            </div>
            <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={duplicateCopyLessons}
                onChange={(e) => setDuplicateCopyLessons(e.target.checked)}
              />
              <span>
                <span className="font-medium">
                  {t("duplicateCopyLessonsLabel")}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t("duplicateCopyLessonsHelper")}
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateOpen(false)}
              disabled={duplicateMutation.isPending}
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={() => duplicateMutation.mutate()}
              disabled={
                !duplicateSlug.trim() || duplicateMutation.isPending
              }
            >
              {duplicateMutation.isPending
                ? t("duplicateSubmitting")
                : t("duplicateSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseStatsContent({ stats }: { stats: CourseStats }) {
  const tStats = useTranslations("Academy.courseStats");

  // Derived caption for the average days tile — null when nobody has
  // finished yet, otherwise the count of completers contributing to the
  // average so admins can read the number with the right confidence.
  const avgCaption =
    stats.avgDaysToFirstCompletion === null
      ? tStats("avgPending")
      : tStats("avgFromCompleters", { count: stats.completedCount });

  // Drop-off detection: any lesson where the completed count is < 50%
  // of the highest gets a subtle warning highlight.
  const peakCompletions = stats.lessonCompletionDistribution.reduce(
    (max, l) => Math.max(max, l.completedCount),
    0,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={tStats("enrolled")} value={stats.enrolledCount} />
        <StatTile label={tStats("started")} value={stats.startedCount} />
        <StatTile
          label={tStats("completed")}
          value={stats.completedCount}
          tone={stats.completedCount > 0 ? "success" : "default"}
        />
        <StatTile
          label={tStats("rate")}
          value={`${stats.completionRate}%`}
          caption={
            stats.avgDaysToFirstCompletion !== null
              ? tStats("avgDays", {
                  days: stats.avgDaysToFirstCompletion,
                })
              : avgCaption
          }
          tone={stats.completionRate >= 50 ? "success" : "default"}
        />
      </div>

      {stats.lessonCompletionDistribution.length > 0 && (
        <div className="mt-5">
          <div className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {tStats("perLessonDistribution")}
          </div>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {stats.lessonCompletionDistribution.map((l, idx) => {
              const dropOff =
                peakCompletions > 0 &&
                l.completedCount < peakCompletions * 0.5;
              return (
                <li
                  key={l.lessonId}
                  className="flex items-center gap-3 px-3 py-2 text-xs"
                >
                  <Mono className="w-7 shrink-0 text-muted-foreground">
                    {String(idx + 1).padStart(2, "0")}
                  </Mono>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                    {l.slug}
                  </span>
                  <div className="w-32 shrink-0">
                    <AcademyProgressBar
                      completed={l.completedCount}
                      total={Math.max(peakCompletions, 1)}
                      hideCount
                    />
                  </div>
                  <Mono
                    className={
                      dropOff
                        ? "w-10 shrink-0 text-right text-[var(--color-warning)]"
                        : "w-10 shrink-0 text-right text-foreground"
                    }
                  >
                    {l.completedCount}
                  </Mono>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
