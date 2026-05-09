"use client";

import { useTranslations } from "next-intl";
import { Download, FileText } from "lucide-react";
import type { LessonAttachment } from "@/hooks/queries";

interface LessonAttachmentsProps {
  attachments: LessonAttachment[];
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Downloadable resources block rendered below the lesson body. Empty
 * array short-circuits the render so a lesson without attachments
 * shows nothing — there's no "no resources yet" placeholder to clutter
 * the page.
 */
export function LessonAttachments({ attachments }: LessonAttachmentsProps) {
  const t = useTranslations("Academy.lesson.attachments");
  if (attachments.length === 0) return null;

  return (
    <section
      aria-labelledby="lesson-attachments-heading"
      className="mt-10 rounded-md border border-border bg-card p-5"
    >
      <h2
        id="lesson-attachments-heading"
        className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground"
      >
        {t("title")}
      </h2>
      <ul className="mt-3 space-y-1.5">
        {attachments.map((a) => (
          <li key={a.id}>
            <a
              href={a.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-3 rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-muted"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {a.filename}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {humanSize(a.sizeBytes)}
              </span>
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
