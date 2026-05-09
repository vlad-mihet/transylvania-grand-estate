"use client";

import { useEffect, useState } from "react";
import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tge/ui";
import { GripVertical, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { computeReadingTimeMinutes } from "@tge/types/utils/reading-time";
import { cn } from "@tge/utils";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { Mono } from "@/components/shared/mono";
import { StatusBadge } from "@/components/shared/status-badge";
import { pickTitle } from "@/lib/academy/pick-title";

export type LessonsTableLesson = {
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

interface LessonsTableProps {
  lessons: LessonsTableLesson[];
  searchQuery: string;
  courseId: string;
  isLoading?: boolean;
  onReorder: (lessonIds: string[]) => void;
  onDelete: (id: string) => void;
}

const statusDotClass: Record<LessonsTableLesson["status"], string> = {
  published: "bg-[var(--color-success)]",
  draft: "bg-[var(--color-warning)]",
  archived: "bg-muted-foreground/40",
};

export function LessonsTable({
  lessons,
  searchQuery,
  courseId,
  isLoading,
  onReorder,
  onDelete,
}: LessonsTableProps) {
  const tLessons = useTranslations("Academy.lessons");
  const locale = useLocale();

  const [ordered, setOrdered] = useState<LessonsTableLesson[]>([]);
  useEffect(() => setOrdered(lessons), [lessons]);

  const trimmed = searchQuery.trim().toLowerCase();
  const isFiltered = trimmed.length > 0;
  const visible = isFiltered
    ? ordered.filter((lesson) => {
        if (lesson.slug.toLowerCase().includes(trimmed)) return true;
        for (const value of Object.values(lesson.title)) {
          if (value && value.toLowerCase().includes(trimmed)) return true;
        }
        return false;
      })
    : ordered;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((l) => l.id === active.id);
    const newIndex = ordered.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);
    onReorder(next.map((l) => l.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={visible.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
        // Drag is meaningless when the visible list is filtered: the
        // reorder endpoint requires the full course sequence in one shot,
        // and a partial list would silently 400.
        disabled={isFiltered}
      >
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-10" aria-label={tLessons("dragHandleAria")} />
                <TableHead className="w-12 text-xs uppercase tracking-wider">
                  {tLessons("columnPosition")}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  {tLessons("columnTitle")}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  {tLessons("columnType")}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  {tLessons("columnDuration")}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  {tLessons("columnStatus")}
                </TableHead>
                <TableHead className="w-10" aria-label={tLessons("actionsAria")} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonLessonRow key={i} />
                ))
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    {isFiltered ? tLessons("searchEmpty") : tLessons("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((lesson) => {
                  // Position is the lesson's place in the FULL ordered
                  // list, not the filtered view — so a search result
                  // still shows "lesson 47" rather than reshuffled "1, 2, 3".
                  const idx = ordered.findIndex((l) => l.id === lesson.id);
                  return (
                    <SortableLessonRow
                      key={lesson.id}
                      lesson={lesson}
                      index={idx}
                      locale={locale}
                      courseId={courseId}
                      onDelete={() => onDelete(lesson.id)}
                      reorderDisabled={isFiltered}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SkeletonLessonRow() {
  return (
    <TableRow>
      <TableCell className="w-10 px-2">
        <Skeleton className="h-4 w-4" />
      </TableCell>
      <TableCell className="w-12 px-4">
        <Skeleton className="h-4 w-6" />
      </TableCell>
      <TableCell className="px-4">
        <Skeleton className="h-4 w-3/4" />
      </TableCell>
      <TableCell className="px-4">
        <Skeleton className="h-3 w-12" />
      </TableCell>
      <TableCell className="px-4">
        <Skeleton className="h-3 w-16" />
      </TableCell>
      <TableCell className="px-4">
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell className="w-10 px-2">
        <Skeleton className="h-4 w-4" />
      </TableCell>
    </TableRow>
  );
}

function SortableLessonRow({
  lesson,
  index,
  locale,
  courseId,
  onDelete,
  reorderDisabled,
}: {
  lesson: LessonsTableLesson;
  index: number;
  locale: string;
  courseId: string;
  onDelete: () => void;
  reorderDisabled: boolean;
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

  const title = pickTitle(lesson.title, lesson.slug, locale);
  const transformStyle = transform
    ? {
        transform: `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`,
        transition,
      }
    : { transition };

  return (
    <TableRow
      ref={setNodeRef}
      style={transformStyle}
      data-dragging={isDragging ? "true" : undefined}
      className="data-[dragging=true]:bg-muted data-[dragging=true]:opacity-85"
      {...attributes}
    >
      <TableCell className="w-10 px-2">
        {reorderDisabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                aria-disabled
                className="inline-flex h-6 w-6 cursor-not-allowed items-center justify-center rounded text-muted-foreground/40"
              >
                <GripVertical className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{tLessons("reorderDisabledHint")}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label={tLessons("dragRowAria", { position: index + 1 })}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </TableCell>
      <TableCell className="w-12 px-4">
        <Mono className="text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </Mono>
      </TableCell>
      <TableCell className="px-4">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              statusDotClass[lesson.status],
            )}
          />
          <div className="min-w-0">
            <Link
              href={`/academy/courses/${courseId}/lessons/${lesson.id}/edit`}
              className="block truncate font-medium hover:underline"
            >
              {title}
            </Link>
            <Mono className="block truncate text-[11px] text-muted-foreground">
              {lesson.slug}
            </Mono>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-4 text-xs text-foreground/80">
        {tType(lesson.type)}
      </TableCell>
      <TableCell className="px-4">
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
              seconds: String(lesson.videoDurationSeconds % 60).padStart(2, "0"),
            })}
          </Mono>
        ) : (
          <span className="text-muted-foreground">
            {tLessons("durationNone")}
          </span>
        )}
      </TableCell>
      <TableCell className="px-4">
        <StatusBadge status={lesson.status} />
      </TableCell>
      <TableCell className="w-10 px-2 text-right">
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
      </TableCell>
    </TableRow>
  );
}
