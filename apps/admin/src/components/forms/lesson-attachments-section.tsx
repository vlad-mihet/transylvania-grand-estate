"use client";

import { useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button, LoadingState } from "@tge/ui";
import { FileText, GripVertical, Trash2, Upload } from "lucide-react";
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
import { CSS } from "@dnd-kit/utilities";
import { apiClient, ApiError, getAccessToken } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Mono } from "@/components/shared/mono";
import { Can } from "@/components/shared/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SectionCard } from "@/components/shared/section-card";
import { cn } from "@tge/utils";

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  sortOrder: number;
  createdAt: string;
};

interface LessonAttachmentsSectionProps {
  lessonId: string;
}

const MAX_ATTACHMENTS = 10;

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Drop-in attachments manager for the lesson edit page. Renders only on
 * the edit surface (lesson must already exist for the attach POST to
 * have a target). Supports upload, reorder via dnd-kit, and remove —
 * no inline rename in V1; remove and re-upload is the reliable path.
 */
export function LessonAttachmentsSection({
  lessonId,
}: LessonAttachmentsSectionProps) {
  const t = useTranslations("Academy.lessonAttachments");
  const tc = useTranslations("Common");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const listQuery = useQuery({
    queryKey: ["academy-lesson-attachments", lessonId],
    queryFn: () =>
      apiClient<Attachment[]>(
        `/admin/academy/lessons/${lessonId}/attachments`,
      ),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // We bypass the JSON apiClient here — multipart upload needs a
      // raw FormData body and an in-memory Bearer token (cookies aren't
      // used by the admin API client). Mirrors the cover-image uploader.
      const base = process.env.NEXT_PUBLIC_API_URL;
      if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");
      const formData = new FormData();
      formData.append("file", file);
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const siteId = process.env.NEXT_PUBLIC_SITE_ID;
      if (siteId) headers["X-Site"] = siteId;
      const res = await fetch(
        `${base}/admin/academy/lessons/${lessonId}/attachments`,
        { method: "POST", body: formData, headers },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new ApiError(
          res.status,
          err.error?.message ?? res.statusText,
          `/admin/academy/lessons/${lessonId}/attachments`,
        );
      }
      return (await res.json()) as { data?: Attachment } | Attachment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["academy-lesson-attachments", lessonId],
      });
      toast.success(t("uploadSuccess"));
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : t("uploadFailed"),
      ),
  });

  const reorderMutation = useMutation({
    mutationFn: (attachmentIds: string[]) =>
      apiClient(
        `/admin/academy/lessons/${lessonId}/attachments/reorder`,
        { method: "POST", body: { attachmentIds } },
      ),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["academy-lesson-attachments", lessonId],
      });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : t("reorderFailed"),
      ),
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(
        `/admin/academy/lessons/${lessonId}/attachments/${id}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["academy-lesson-attachments", lessonId],
      });
      toast.success(t("deleteSuccess"));
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : t("deleteFailed"),
      );
      setDeleteId(null);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const items = listQuery.data ?? [];
  const atCap = items.length >= MAX_ATTACHMENTS;

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    // Optimistic local update so the row settles immediately; the
    // reorder call rewrites sortOrder on the server, the invalidation
    // on settle picks up the canonical state.
    queryClient.setQueryData(
      ["academy-lesson-attachments", lessonId],
      next,
    );
    reorderMutation.mutate(next.map((i) => i.id));
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
  }

  return (
    <SectionCard
      title={t("title")}
      description={t("description")}
      headerActions={
        <Can action="academy.lesson.update">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.zip,.ppt,.pptx,.doc,.docx,.txt,application/pdf,application/zip,application/msword,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={onPickFile}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending || atCap}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploadMutation.isPending ? t("uploading") : t("addButton")}
          </Button>
        </Can>
      }
    >
      {listQuery.isLoading ? (
        <LoadingState label={tc("loading")} />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-border rounded-md border border-border">
              {items.map((item) => (
                <AttachmentRow
                  key={item.id}
                  attachment={item}
                  onDelete={() => setDeleteId(item.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        {t("capHint", { current: items.length, max: MAX_ATTACHMENTS })}
      </p>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("confirmDeleteTitle")}
        description={t("confirmDeleteDescription")}
        confirmLabel={tc("delete")}
        loading={deleteMutation.isPending}
        tone="destructive"
      />
    </SectionCard>
  );
}

function AttachmentRow({
  attachment,
  onDelete,
}: {
  attachment: Attachment;
  onDelete: () => void;
}) {
  const t = useTranslations("Academy.lessonAttachments");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attachment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5",
        isDragging && "z-10 bg-muted/40",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t("dragHandleAria")}
        className="touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <a
        href={attachment.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-sm hover:underline"
        title={attachment.filename}
      >
        {attachment.filename}
      </a>
      <Mono className="shrink-0 text-[10px] text-muted-foreground">
        {humanSize(attachment.sizeBytes)}
      </Mono>
      <Can action="academy.lesson.update">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-[var(--color-danger)]"
          onClick={onDelete}
          aria-label={t("deleteAria", { filename: attachment.filename })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </Can>
    </li>
  );
}
