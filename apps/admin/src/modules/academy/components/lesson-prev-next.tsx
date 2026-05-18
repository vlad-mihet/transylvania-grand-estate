"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Mono } from "@/components/shared/mono";
import { pickTitle } from "@/modules/academy";
import { cn } from "@tge/utils";

interface SiblingPointer {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
}

interface LessonPrevNextProps {
  courseId: string;
  position: number;
  total: number;
  prev: SiblingPointer | null;
  next: SiblingPointer | null;
}

/**
 * In-editor lesson navigator. Renders a compact strip showing the current
 * position plus prev/next buttons. Alt+ArrowLeft / Alt+ArrowRight bind
 * keyboard shortcuts; the modifier avoids clashing with text-input arrow
 * navigation in the form fields and markdown editor.
 */
export function LessonPrevNext({
  courseId,
  position,
  total,
  prev,
  next,
}: LessonPrevNextProps) {
  const locale = useLocale();
  const t = useTranslations("Academy.lessons");
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (e.key === "ArrowLeft" && prev) {
        e.preventDefault();
        router.push(`/academy/courses/${courseId}/lessons/${prev.id}/edit`);
      } else if (e.key === "ArrowRight" && next) {
        e.preventDefault();
        router.push(`/academy/courses/${courseId}/lessons/${next.id}/edit`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, courseId, prev, next]);

  const prevTitle = prev ? pickTitle(prev.title, prev.slug, locale) : null;
  const nextTitle = next ? pickTitle(next.title, next.slug, locale) : null;

  const linkClass =
    "inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted";
  const disabledClass =
    "inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground";

  return (
    <div className="flex items-center justify-between gap-2 rounded-sm border border-border bg-muted/30 px-3 py-2">
      {prev ? (
        <Link
          href={`/academy/courses/${courseId}/lessons/${prev.id}/edit`}
          className={linkClass}
          aria-label={t("prevLessonAria", { title: prevTitle ?? "" })}
        >
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[24ch] truncate">
            {prevTitle ?? t("previousLesson")}
          </span>
        </Link>
      ) : (
        <span className={cn(disabledClass, "opacity-60")} aria-disabled="true">
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          <span>{t("previousLesson")}</span>
        </span>
      )}

      <Mono className="text-[11px] text-muted-foreground">
        {t("lessonOf", { position, total })}
      </Mono>

      {next ? (
        <Link
          href={`/academy/courses/${courseId}/lessons/${next.id}/edit`}
          className={linkClass}
          aria-label={t("nextLessonAria", { title: nextTitle ?? "" })}
        >
          <span className="max-w-[24ch] truncate">
            {nextTitle ?? t("nextLesson")}
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </Link>
      ) : (
        <span className={cn(disabledClass, "opacity-60")} aria-disabled="true">
          <span>{t("nextLesson")}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </span>
      )}
    </div>
  );
}
