"use client";

import { type ComponentType } from "react";
import {
  Archive,
  BookOpen,
  Eye,
  GraduationCap,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tge/ui";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";
import { Link } from "@/i18n/navigation";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { Can } from "@/components/shared/can";

export interface CourseCardData {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  status: "draft" | "published" | "archived";
  visibility: "public" | "enrolled";
  coverImage?: string | null;
  updatedAt: string;
  _count?: { lessons: number };
}

interface CourseCardProps {
  course: CourseCardData;
  /** Display title resolved via `pickTitle` upstream so the card stays locale-agnostic. */
  title: string;
  selected: boolean;
  onToggleSelect: () => void;
  onSetStatus: (status: "draft" | "published" | "archived") => void;
  onDelete: () => void;
  isStatusPending?: boolean;
}

const STATUS_DOT: Record<CourseCardData["status"], string> = {
  draft: "bg-amber-400",
  published: "bg-emerald-500",
  archived: "bg-zinc-400",
};

/**
 * Studio-feel course card for the Academy courses grid. Cover image (or
 * gradient fallback) anchors the card; status, title, slug, and lesson count
 * stack below. Body of the card navigates to detail; selection + actions
 * sit in the chrome to avoid stealing the primary click target.
 */
export function CourseCard({
  course,
  title,
  selected,
  onToggleSelect,
  onSetStatus,
  onDelete,
  isStatusPending,
}: CourseCardProps) {
  const t = useTranslations("Academy.courses");
  const tStatus = useTranslations("Academy.statuses");
  const detailHref = `/academy/courses/${course.id}` as const;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-md border bg-card transition-all",
        selected
          ? "border-copper shadow-[0_0_0_1px_var(--color-copper)]"
          : "border-border hover:border-[color-mix(in_srgb,var(--color-copper)_40%,var(--border))] hover:shadow-sm",
      )}
    >
      <Link
        href={detailHref}
        aria-label={title}
        className="relative block aspect-[16/9] w-full overflow-hidden bg-muted"
      >
        {course.coverImage ? (
          // API serves cover images from a separate origin; using next/image
          // here would require widening the remotePatterns config for each
          // upload host. The existing course-detail uses a plain <img> too.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverImage}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <CourseCoverFallback slug={course.slug} />
        )}

        {/* Status pill overlay. */}
        <span
          className={cn(
            "absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-sm bg-background/95 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground shadow-sm backdrop-blur",
            "mono",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[course.status])} />
          {tStatus(course.status)}
        </span>
      </Link>

      {/* Selection checkbox + action menu — kept on top of the cover so the
          card body remains a single clickable target. */}
      <div
        data-selected={selected}
        className="pointer-events-none absolute right-2.5 top-2.5 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 data-[selected=true]:opacity-100"
      >
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          aria-label={t("selectAria", { title })}
          className="pointer-events-auto border-background/80 bg-background/95 shadow-sm backdrop-blur"
        />
        <CourseActionMenu
          status={course.status}
          onSetStatus={onSetStatus}
          onDelete={onDelete}
          isStatusPending={isStatusPending}
          title={title}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="min-w-0">
          <Link
            href={detailHref}
            className="block text-sm font-semibold leading-snug text-foreground transition-colors hover:text-copper"
          >
            <span className="line-clamp-2">{title}</span>
          </Link>
          <Mono className="mt-1 block truncate text-[11px] text-muted-foreground">
            {course.slug}
          </Mono>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" />
            {t("lessonCount", { count: course._count?.lessons ?? 0 })}
          </span>
          <RelativeTime
            value={course.updatedAt}
            className="text-[11px] text-muted-foreground"
          />
        </div>
      </div>
    </article>
  );
}

function CourseCoverFallback({ slug }: { slug: string }) {
  const initial = slug.charAt(0).toUpperCase() || "·";
  return (
    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-copper)_18%,var(--card)),color-mix(in_srgb,var(--color-copper)_4%,var(--card)))]">
      <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-background/70 text-copper shadow-sm backdrop-blur-sm">
        <GraduationCap className="h-7 w-7" />
      </div>
      <span className="sr-only">{initial}</span>
    </div>
  );
}

interface CourseActionMenuProps {
  status: CourseCardData["status"];
  onSetStatus: (status: "draft" | "published" | "archived") => void;
  onDelete: () => void;
  isStatusPending?: boolean;
  title: string;
}

function CourseActionMenu({
  status,
  onSetStatus,
  onDelete,
  isStatusPending,
  title,
}: CourseActionMenuProps) {
  const t = useTranslations("Academy.courses");
  const tc = useTranslations("Common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("actionsAria", { title })}
          className="pointer-events-auto bg-background/95 text-foreground shadow-sm backdrop-blur hover:bg-background"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {status !== "published" && (
          <Can action="academy.course.update">
            <StatusItem
              onSelect={() => onSetStatus("published")}
              disabled={isStatusPending}
              icon={Eye}
              label={t("publishAction")}
            />
          </Can>
        )}
        {status !== "archived" && (
          <Can action="academy.course.update">
            <StatusItem
              onSelect={() => onSetStatus("archived")}
              disabled={isStatusPending}
              icon={Archive}
              label={t("archiveAction")}
            />
          </Can>
        )}
        {status !== "draft" && (
          <Can action="academy.course.update">
            <StatusItem
              onSelect={() => onSetStatus("draft")}
              disabled={isStatusPending}
              icon={RotateCcw}
              label={t("restoreAction")}
            />
          </Can>
        )}
        <Can action="academy.course.delete">
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            <span>{tc("delete")}</span>
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusItem({
  onSelect,
  disabled,
  icon: Icon,
  label,
}: {
  onSelect: () => void;
  disabled?: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} disabled={disabled}>
      <Icon className="mr-2 h-3.5 w-3.5" />
      <span>{label}</span>
    </DropdownMenuItem>
  );
}
