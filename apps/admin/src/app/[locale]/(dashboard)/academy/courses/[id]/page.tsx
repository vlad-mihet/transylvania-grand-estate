"use client";

import { useState } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
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
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import { cn } from "@tge/utils";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { Mono } from "@/components/shared/mono";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { LessonsTable, type LessonsTableLesson } from "@/modules/academy/components/lessons-table";
import { AcademyProgressBar } from "@/modules/academy/components/academy-progress-bar";
import {
  pickTitle,
  useAcademyCourse,
  useAcademyCourseStats,
  useDeleteLesson,
  useDuplicateCourse,
  useMoveLesson,
  useUpdateCourse,
} from "@/modules/academy";
import { useResourceList } from "@/hooks/use-resource-list";

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
  const t = useTranslations("Academy.courses");
  const tLessons = useTranslations("Academy.lessons");
  const tStatus = useTranslations("Academy.statuses");
  const tVisibility = useTranslations("Academy.visibilities");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");
  const tStats = useTranslations("Academy.courseStats");

  const courseQuery = useAcademyCourse<Course>(params.id);

  // Paginated lesson list, page state synced to the URL. Drag-and-drop
  // reorder calls `POST /lessons/:id/move` with the destination's global
  // `targetOrder`, so DnD and pagination coexist cleanly — cross-page
  // moves use the "Move to position…" row action.
  const lessonsList = useResourceList<LessonsTableLesson>({
    resource: `academy-lessons-${params.id}`,
    endpoint: `/admin/academy/courses/${params.id}/lessons`,
    defaultLimit: 25,
    defaultSort: "order",
  });

  const statsQuery = useAcademyCourseStats<CourseStats>(params.id);
  const updateCourse = useUpdateCourse();
  const moveLesson = useMoveLesson(params.id);
  const duplicateCourse = useDuplicateCourse();
  const deleteLesson = useDeleteLesson(params.id);

  const publishMutation = {
    isPending: updateCourse.isPending,
    mutate: () =>
      updateCourse.mutate(
        {
          id: params.id,
          body: {
            status:
              courseQuery.data?.status === "published" ? "draft" : "published",
          },
        },
        {
          onSuccess: () => toast.success(tt("courseStatusUpdated")),
          onError: (err) =>
            toast.error(
              err instanceof ApiError ? err.message : tt("courseStatusFailed"),
            ),
        },
      ),
  };

  const moveMutation = {
    isPending: moveLesson.isPending,
    mutate: (input: { lessonId: string; targetOrder: number }) =>
      moveLesson.mutate(input, {
        onSettled: () => lessonsList.refetch(),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : tt("lessonReorderFailed"),
          ),
      }),
  };

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateSlug, setDuplicateSlug] = useState("");
  const [duplicateCopyLessons, setDuplicateCopyLessons] = useState(true);
  const duplicateMutation = {
    isPending: duplicateCourse.isPending,
    mutate: () =>
      duplicateCourse.mutate(
        {
          id: params.id,
          body: { slug: duplicateSlug.trim(), copyLessons: duplicateCopyLessons },
        },
        {
          onSuccess: (created) => {
            toast.success(tt("courseDuplicated"));
            setDuplicateOpen(false);
            setDuplicateSlug("");
            router.push(`/${locale}/academy/courses/${created.id}/edit`);
          },
          onError: (err) =>
            toast.error(
              err instanceof ApiError ? err.message : tt("courseDuplicateFailed"),
            ),
        },
      ),
  };

  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  const deleteLessonMutation = {
    isPending: deleteLesson.isPending,
    mutate: (id: string) =>
      deleteLesson.mutate(id, {
        onSuccess: () => {
          lessonsList.refetch();
          toast.success(tt("lessonDeleted"));
          setDeleteLessonId(null);
        },
        onError: (err) =>
          toast.error(
              err instanceof ApiError ? err.message : tt("lessonDeleteFailed"),
          ),
      }),
  };

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
  // Total lesson count comes from the paginated envelope's meta; falls back
  // to the course's denormalized `_count.lessons` while the list query is
  // still in flight, so the header copy doesn't flicker "0 lessons" → "180".
  const lessonCount =
    lessonsList.meta?.total ?? course._count?.lessons ?? lessonsList.items.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={t("detailSummary", {
          lessonCount,
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

      <div className="w-full sm:max-w-sm">
        <SearchInput
          value={lessonsList.search}
          onValueChange={lessonsList.setSearch}
          placeholder={tLessons("searchPlaceholder")}
          aria-label={tLessons("searchPlaceholder")}
        />
      </div>

      <LessonsTable
        lessons={lessonsList.items}
        meta={lessonsList.meta}
        page={lessonsList.page}
        onPageChange={lessonsList.setPage}
        limit={lessonsList.limit}
        onLimitChange={lessonsList.setLimit}
        sort={lessonsList.sort ?? "order"}
        searchActive={!!lessonsList.search}
        courseId={course.id}
        isLoading={lessonsList.isLoading}
        onMove={(lessonId, targetOrder) =>
          moveMutation.mutate({ lessonId, targetOrder })
        }
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

// Rows per page in the per-lesson completion distribution. 20 keeps the
// list at "scroll without losing the page" length on 180-lesson courses
// without forcing the admin through too many pages to scan drop-off.
const DISTRIBUTION_PAGE_SIZE = 20;

function CourseStatsContent({ stats }: { stats: CourseStats }) {
  const tStats = useTranslations("Academy.courseStats");
  const tc = useTranslations("Common");
  // The distribution is a deep-dive surface — the stats tiles above
  // already answer the at-a-glance question ("are students finishing?").
  // Collapse by default so a 180-lesson course doesn't push the lessons
  // table off the first screen.
  const [distributionOpen, setDistributionOpen] = useState(false);
  const [distributionPage, setDistributionPage] = useState(1);

  // Derived caption for the average days tile — null when nobody has
  // finished yet, otherwise the count of completers contributing to the
  // average so admins can read the number with the right confidence.
  const avgCaption =
    stats.avgDaysToFirstCompletion === null
      ? tStats("avgPending")
      : tStats("avgFromCompleters", { count: stats.completedCount });

  // Drop-off detection: any lesson where the completed count is < 50%
  // of the highest gets a subtle warning highlight. Compared against the
  // FULL distribution so a row stays flagged even when paged out of view.
  const peakCompletions = stats.lessonCompletionDistribution.reduce(
    (max, l) => Math.max(max, l.completedCount),
    0,
  );

  const distributionTotal = stats.lessonCompletionDistribution.length;
  const distributionTotalPages = Math.max(
    1,
    Math.ceil(distributionTotal / DISTRIBUTION_PAGE_SIZE),
  );
  const safePage = Math.min(distributionPage, distributionTotalPages);
  const distributionStart = (safePage - 1) * DISTRIBUTION_PAGE_SIZE;
  const visibleDistribution = stats.lessonCompletionDistribution.slice(
    distributionStart,
    distributionStart + DISTRIBUTION_PAGE_SIZE,
  );
  const distributionFrom = distributionTotal === 0 ? 0 : distributionStart + 1;
  const distributionTo = Math.min(
    distributionTotal,
    distributionStart + DISTRIBUTION_PAGE_SIZE,
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

      {distributionTotal > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setDistributionOpen((v) => !v)}
            aria-expanded={distributionOpen}
            className="mono inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                distributionOpen ? "rotate-0" : "-rotate-90",
              )}
            />
            {tStats("perLessonDistribution")}
            <span className="ml-1 text-muted-foreground/70">
              ({distributionTotal})
            </span>
          </button>
          {distributionOpen && (
          <>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {visibleDistribution.map((l, idx) => {
              const dropOff =
                peakCompletions > 0 &&
                l.completedCount < peakCompletions * 0.5;
              // Position is the lesson's index in the FULL ordered list,
              // not the index within this page — admins reading "23 →"
              // and "57 →" need to map back to the lesson reorder labels.
              const position = distributionStart + idx + 1;
              return (
                <li
                  key={l.lessonId}
                  className="flex items-center gap-3 px-3 py-2 text-xs"
                >
                  <Mono className="w-7 shrink-0 text-muted-foreground">
                    {String(position).padStart(2, "0")}
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
          {distributionTotal > DISTRIBUTION_PAGE_SIZE && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
              <Mono className="text-muted-foreground">
                {tc("rangeOf", {
                  from: distributionFrom,
                  to: distributionTo,
                  total: distributionTotal,
                })}
              </Mono>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDistributionPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Mono className="min-w-[4.5rem] text-center text-muted-foreground">
                  {tc("page", {
                    current: safePage,
                    total: distributionTotalPages,
                  })}
                </Mono>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDistributionPage((p) =>
                      Math.min(distributionTotalPages, p + 1),
                    )
                  }
                  disabled={safePage >= distributionTotalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      )}
    </>
  );
}
