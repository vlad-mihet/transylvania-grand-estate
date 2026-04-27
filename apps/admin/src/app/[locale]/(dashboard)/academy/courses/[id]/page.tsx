"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Button, Input } from "@tge/ui";
import { GripVertical, Plus, Search, Trash2 } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { apiClient, ApiError } from "@/lib/api-client";
import { computeReadingTimeMinutes } from "@tge/types/utils/reading-time";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingState } from "@tge/ui";
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

type Lesson = {
  id: string;
  slug: string;
  order: number;
  title: Record<string, string | undefined>;
  content: Record<string, string | undefined>;
  type: "text" | "video";
  status: "draft" | "published" | "archived";
  videoDurationSeconds: number | null;
  publishedAt: string | null;
};

type LessonList = { data: Lesson[]; meta: { total: number } };

export default function AcademyCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("Academy.courses");
  const tLessons = useTranslations("Academy.lessons");
  const tStatus = useTranslations("Academy.statuses");
  const tVisibility = useTranslations("Academy.visibilities");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");

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

  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);
  useEffect(() => {
    if (lessonsQuery.data) setOrderedLessons(lessonsQuery.data.data);
  }, [lessonsQuery.data]);

  const [searchQuery, setSearchQuery] = useState("");
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isFiltered = trimmedQuery.length > 0;
  const visibleLessons = isFiltered
    ? orderedLessons.filter((lesson) => {
        if (lesson.slug.toLowerCase().includes(trimmedQuery)) return true;
        for (const value of Object.values(lesson.title)) {
          if (value && value.toLowerCase().includes(trimmedQuery)) return true;
        }
        return false;
      })
    : orderedLessons;

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedLessons.findIndex((l) => l.id === active.id);
    const newIndex = orderedLessons.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(orderedLessons, oldIndex, newIndex);
    setOrderedLessons(next);
    reorderMutation.mutate(next.map((l) => l.id));
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={t("detailSummary", {
          lessonCount: orderedLessons.length,
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
        {isFiltered ? (
          <p className="text-xs text-muted-foreground">
            {tLessons("reorderDisabledHint")}
          </p>
        ) : null}
      </div>

      {/*
        DnD context sits OUTSIDE the table element. @dnd-kit renders a
        hidden <div> accessibility live region as a child of DndContext;
        nesting it between <table> and <tbody> is invalid HTML and triggers
        a hydration mismatch. Wrapping the whole table keeps the useSortable
        IDs reachable without that.
      */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={visibleLessons.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
          // Disable sortable while a search filter is active — the filtered
          // view doesn't represent the real order, so a drag would yield
          // nonsense. The reorder endpoint also requires the full lesson
          // sequence; partial reordering would 400.
          disabled={isFiltered}
        >
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {!isFiltered ? (
                    <th
                      className="w-10 px-2 py-3"
                      aria-label={tLessons("dragHandleAria")}
                    />
                  ) : null}
                  <th className="w-12 px-4 py-3">{tLessons("columnPosition")}</th>
                  <th className="px-4 py-3">{tLessons("columnTitle")}</th>
                  <th className="px-4 py-3">{tLessons("columnType")}</th>
                  <th className="px-4 py-3">{tLessons("columnDuration")}</th>
                  <th className="px-4 py-3">{tLessons("columnStatus")}</th>
                  <th className="w-10 px-2 py-3" aria-label={tLessons("actionsAria")} />
                </tr>
              </thead>
              <tbody>
                {visibleLessons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isFiltered ? 6 : 7}
                      className="px-4 py-6 text-center text-sm text-muted-foreground"
                    >
                      {isFiltered ? tLessons("searchEmpty") : tLessons("empty")}
                    </td>
                  </tr>
                ) : (
                  visibleLessons.map((lesson) => {
                    // Position is the lesson's place in the FULL ordered
                    // list, not the filtered view — so a search result
                    // still shows "lesson 47" rather than reshuffled "1, 2, 3".
                    const idx = orderedLessons.findIndex(
                      (l) => l.id === lesson.id,
                    );
                    return (
                      <SortableLessonRow
                        key={lesson.id}
                        lesson={lesson}
                        index={idx}
                        locale={locale}
                        courseId={course.id}
                        onDelete={() => setDeleteLessonId(lesson.id)}
                        showDragHandle={!isFiltered}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>

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
    </div>
  );
}

function SortableLessonRow({
  lesson,
  index,
  locale,
  courseId,
  onDelete,
  showDragHandle,
}: {
  lesson: Lesson;
  index: number;
  locale: string;
  courseId: string;
  onDelete: () => void;
  showDragHandle: boolean;
}) {
  const tLessons = useTranslations("Academy.lessons");
  const tType = useTranslations("Academy.lessonTypes");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
    backgroundColor: isDragging ? "var(--color-muted)" : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  const title = pickTitle(lesson.title, lesson.slug, locale);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-t border-border"
      {...attributes}
    >
      {showDragHandle ? (
        <td className="w-10 cursor-grab px-2 py-3 text-muted-foreground active:cursor-grabbing">
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
            aria-label={tLessons("dragRowAria", { position: index + 1 })}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      ) : null}
      <td className="px-4 py-3">
        <Mono className="text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </Mono>
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/academy/courses/${courseId}/lessons/${lesson.id}/edit`}
          className="block font-medium hover:underline"
        >
          {title}
        </Link>
        <Mono className="block text-[11px] text-muted-foreground">
          {lesson.slug}
        </Mono>
      </td>
      <td className="px-4 py-3 text-xs text-foreground/80">
        {tType(lesson.type)}
      </td>
      <td className="px-4 py-3">
        {lesson.type === "text" ? (
          <Mono>
            {tLessons("readingTime", {
              minutes: computeReadingTimeMinutes(
                lesson.content?.[locale] ?? lesson.content?.ro ?? "",
              ),
            })}
          </Mono>
        ) : lesson.videoDurationSeconds != null ? (
          <Mono>
            {tLessons("videoDuration", {
              minutes: Math.floor(lesson.videoDurationSeconds / 60),
              seconds: String(lesson.videoDurationSeconds % 60).padStart(
                2,
                "0",
              ),
            })}
          </Mono>
        ) : (
          <span className="text-muted-foreground">
            {tLessons("durationNone")}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={lesson.status} />
      </td>
      <td className="w-10 px-2 py-3 text-right">
        <Can action="academy.lesson.delete">
          <button
            type="button"
            onClick={onDelete}
            className="text-[var(--color-danger)] hover:underline"
            aria-label={tLessons("deleteAria", { position: index + 1 })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Can>
      </td>
    </tr>
  );
}
