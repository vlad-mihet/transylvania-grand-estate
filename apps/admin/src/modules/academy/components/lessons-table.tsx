"use client";

import { useState } from "react";
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
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MoveVertical,
  Trash2,
} from "lucide-react";
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
import { pickTitle } from "@/modules/academy";
import type { PaginationMeta } from "@/hooks/use-resource-list";

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
  meta: PaginationMeta | undefined;
  page: number;
  onPageChange: (page: number) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  sort: string;
  searchActive: boolean;
  courseId: string;
  isLoading?: boolean;
  onMove: (lessonId: string, targetOrder: number) => void;
  onDelete: (id: string) => void;
}

const statusDotClass: Record<LessonsTableLesson["status"], string> = {
  published: "bg-[var(--color-success)]",
  draft: "bg-[var(--color-warning)]",
  archived: "bg-muted-foreground/40",
};

// Sparse renumber stride: server writes `(idx + 1) * 10`, so the displayed
// position is the order divided by 10. Manual `order` edits via the lesson
// form can land off-grid; round so labels stay sensible without lying.
function positionOf(lesson: { order: number }): number {
  return Math.max(1, Math.round(lesson.order / 10));
}

export function LessonsTable({
  lessons,
  meta,
  page,
  onPageChange,
  limit,
  onLimitChange,
  sort,
  searchActive,
  courseId,
  isLoading,
  onMove,
  onDelete,
}: LessonsTableProps) {
  const tLessons = useTranslations("Academy.lessons");
  const tc = useTranslations("Common");
  const locale = useLocale();

  // Intra-page reorder requires the natural lesson-order sort and an
  // unfiltered view; otherwise dragged rows are spatially meaningless
  // against the full course sequence. Cross-page moves use the explicit
  // "Move to position…" action below, which works in every mode.
  const dndDisabled = searchActive || sort !== "order";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overLesson = lessons.find((l) => l.id === over.id);
    if (!overLesson) return;
    onMove(String(active.id), positionOf(overLesson));
  };

  const [moveTarget, setMoveTarget] = useState<LessonsTableLesson | null>(null);

  const total = meta?.total ?? lessons.length;
  const totalPages = meta?.totalPages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={lessons.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
          disabled={dndDisabled}
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
                  <TableHead className="w-20" aria-label={tLessons("actionsAria")} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonLessonRow key={i} />
                  ))
                ) : lessons.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="px-4 py-6 text-center text-sm text-muted-foreground"
                    >
                      {searchActive ? tLessons("searchEmpty") : tLessons("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  lessons.map((lesson) => (
                    <SortableLessonRow
                      key={lesson.id}
                      lesson={lesson}
                      locale={locale}
                      courseId={courseId}
                      onDelete={() => onDelete(lesson.id)}
                      onMoveClick={() => setMoveTarget(lesson)}
                      reorderDisabled={dndDisabled}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </DndContext>

      {(total > 0 || totalPages > 1) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
          <Mono className="text-muted-foreground">
            {total === 0
              ? tc("noResults")
              : tc("rangeOf", { from, to, total })}
          </Mono>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="mono h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Mono className="min-w-[4.5rem] text-center text-muted-foreground">
              {tc("page", { current: page, total: totalPages })}
            </Mono>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <MoveLessonDialog
        lesson={moveTarget}
        currentPosition={moveTarget ? positionOf(moveTarget) : 0}
        total={total}
        onClose={() => setMoveTarget(null)}
        onSubmit={(targetOrder) => {
          if (moveTarget) onMove(moveTarget.id, targetOrder);
          setMoveTarget(null);
        }}
      />
    </>
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
      <TableCell className="w-20 px-2">
        <Skeleton className="h-4 w-4" />
      </TableCell>
    </TableRow>
  );
}

function SortableLessonRow({
  lesson,
  locale,
  courseId,
  onDelete,
  onMoveClick,
  reorderDisabled,
}: {
  lesson: LessonsTableLesson;
  locale: string;
  courseId: string;
  onDelete: () => void;
  onMoveClick: () => void;
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
  const position = positionOf(lesson);
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
            aria-label={tLessons("dragRowAria", { position })}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </TableCell>
      <TableCell className="w-12 px-4">
        <Mono className="text-muted-foreground">
          {String(position).padStart(2, "0")}
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
      <TableCell className="w-20 px-2 text-right">
        <div className="inline-flex items-center gap-1">
          <Can action="academy.lesson.update">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onMoveClick}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={tLessons("moveAriaLabel", { position })}
                >
                  <MoveVertical className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{tLessons("movePopoverTitle")}</TooltipContent>
            </Tooltip>
          </Can>
          <Can action="academy.lesson.delete">
            <button
              type="button"
              onClick={onDelete}
              className="text-[var(--color-danger)] hover:underline"
              aria-label={tLessons("deleteAria", { position })}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Can>
        </div>
      </TableCell>
    </TableRow>
  );
}

function MoveLessonDialog({
  lesson,
  currentPosition,
  total,
  onClose,
  onSubmit,
}: {
  lesson: LessonsTableLesson | null;
  currentPosition: number;
  total: number;
  onClose: () => void;
  onSubmit: (targetOrder: number) => void;
}) {
  const open = lesson !== null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {/* The body is keyed by lesson.id so it remounts with a fresh
            input seed each time the admin opens the dialog on a new row.
            Avoids the setState-in-effect pattern. */}
        {lesson ? (
          <MoveLessonDialogBody
            key={lesson.id}
            currentPosition={currentPosition}
            total={total}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MoveLessonDialogBody({
  currentPosition,
  total,
  onClose,
  onSubmit,
}: {
  currentPosition: number;
  total: number;
  onClose: () => void;
  onSubmit: (targetOrder: number) => void;
}) {
  const tLessons = useTranslations("Academy.lessons");
  const tc = useTranslations("Common");
  const [value, setValue] = useState(String(currentPosition));
  const parsed = Number.parseInt(value, 10);
  const valid =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= Math.max(1, total);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{tLessons("movePopoverTitle")}</DialogTitle>
        <DialogDescription>
          {tLessons("moveDescription", { total })}
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSubmit(parsed);
        }}
        className="space-y-3 py-2"
      >
        <div>
          <Label htmlFor="lesson-move-target">
            {tLessons("movePlaceholder")}
          </Label>
          <Input
            id="lesson-move-target"
            type="number"
            min={1}
            max={Math.max(1, total)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="mt-1.5 font-mono"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={!valid}>
            {tLessons("moveSubmit")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
