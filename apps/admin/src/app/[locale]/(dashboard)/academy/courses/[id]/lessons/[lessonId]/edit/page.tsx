"use client";

import { useEffect } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { LessonForm } from "@/components/forms/lesson-form";
import { LessonAttachmentsSection } from "@/components/forms/lesson-attachments-section";
import { LessonPrevNext } from "@/components/academy/lesson-prev-next";
import { Button, LoadingState } from "@tge/ui";
import type { LessonFormValues } from "@/lib/validations/academy";
import type { LessonStatus, LessonType } from "@prisma/client";

type LessonSibling = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
};

type Lesson = {
  id: string;
  courseId: string;
  slug: string;
  order: number;
  title: Record<string, string | undefined>;
  excerpt: Record<string, string | undefined>;
  content: Record<string, string | undefined>;
  type: LessonType;
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  status: LessonStatus;
  position: number;
  total: number;
  prev: LessonSibling | null;
  next: LessonSibling | null;
  draft?: {
    title?: Record<string, string | undefined>;
    excerpt?: Record<string, string | undefined>;
    content?: Record<string, string | undefined>;
  } | null;
};

export default function EditAcademyLessonPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const tCourse = useTranslations("Academy.courses");
  const tLessons = useTranslations("Academy.lessons");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");
  const { can } = usePermissions();

  const previewMutation = useMutation({
    mutationFn: () =>
      apiClient<{ url: string; expiresAt: string }>(
        `/admin/academy/courses/${params.id}/lessons/${params.lessonId}/preview-token`,
        { method: "POST", body: {} },
      ),
    onSuccess: (result) => {
      // Open in a new tab so the editor can flip back to keep editing.
      // Brief popup-blocker dance: most browsers permit window.open from
      // a click handler, but the mutation is async so we open *after*
      // the response — accept a one-time prompt for that case.
      window.open(result.url, "_blank", "noopener,noreferrer");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("previewMintFailed"),
      ),
  });

  useEffect(() => {
    if (!can("academy.lesson.update")) router.replace(`/${locale}/403`);
  }, [can, router, locale]);

  const lessonQuery = useQuery({
    queryKey: ["academy-lesson", params.lessonId],
    queryFn: () =>
      apiClient<Lesson>(
        `/admin/academy/courses/${params.id}/lessons/${params.lessonId}`,
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: {
      input: LessonFormValues & { mode?: "draft" | "publish" };
      advanceTo: string | null;
    }) =>
      apiClient<Lesson>(
        `/admin/academy/courses/${params.id}/lessons/${params.lessonId}`,
        {
          method: "PATCH",
          body: vars.input,
        },
      ).then((res) => ({ res, advanceTo: vars.advanceTo })),
    onSuccess: ({ advanceTo }) => {
      queryClient.invalidateQueries({
        queryKey: ["academy-lesson", params.lessonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["academy-lessons", params.id],
      });
      toast.success(tt("lessonSaved"));
      if (advanceTo) {
        router.push(
          `/${locale}/academy/courses/${params.id}/lessons/${advanceTo}/edit`,
        );
      } else {
        router.push(`/${locale}/academy/courses/${params.id}`);
      }
    },
  });

  if (!can("academy.lesson.update")) return null;

  if (lessonQuery.isLoading) {
    return <LoadingState label={tc("loading")} />;
  }
  if (lessonQuery.isError) {
    const err = lessonQuery.error;
    if (err instanceof ApiError && err.status === 404) notFound();
  }
  if (!lessonQuery.data) {
    notFound();
  }

  const lesson = lessonQuery.data;
  const draft = lesson.draft ?? null;
  const titleSource = draft?.title ?? lesson.title;
  const excerptSource = draft?.excerpt ?? lesson.excerpt;
  const contentSource = draft?.content ?? lesson.content;
  const defaults: Partial<LessonFormValues> = {
    slug: lesson.slug,
    order: lesson.order,
    title: {
      ro: titleSource.ro ?? "",
      en: titleSource.en ?? "",
      fr: titleSource.fr,
      de: titleSource.de,
    },
    excerpt: {
      ro: excerptSource.ro ?? "",
      en: excerptSource.en ?? "",
      fr: excerptSource.fr,
      de: excerptSource.de,
    },
    content: {
      ro: contentSource.ro ?? "",
      en: contentSource.en ?? "",
      fr: contentSource.fr,
      de: contentSource.de,
    },
    type: lesson.type,
    videoUrl: lesson.videoUrl,
    videoDurationSeconds: lesson.videoDurationSeconds,
    status: lesson.status,
  };

  const headline = lesson.title.ro || lesson.title.en || lesson.slug;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 md:px-6">
        <LessonPrevNext
          courseId={params.id}
          position={lesson.position}
          total={lesson.total}
          prev={lesson.prev}
          next={lesson.next}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => previewMutation.mutate()}
          disabled={previewMutation.isPending}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          {previewMutation.isPending
            ? tLessons("previewMinting")
            : tLessons("previewAction")}
        </Button>
      </div>
      <div className="px-4 md:px-6">
        <LessonAttachmentsSection lessonId={lesson.id} />
      </div>

      <LessonForm
        mode="edit"
        defaultValues={defaults}
        onSubmit={(values, saveMode) =>
          updateMutation.mutate({
            input: { ...values, mode: saveMode },
            advanceTo: null,
          })
        }
        onSubmitAndNext={
          lesson.next
            ? (values) =>
                updateMutation.mutate({
                  // "Save & next" promotes the entry to live (publish) since
                  // the editor is moving forward in the sequence and would
                  // otherwise leave a stale draft behind.
                  input: { ...values, mode: "publish" },
                  advanceTo: lesson.next!.id,
                })
            : undefined
        }
        loading={updateMutation.isPending}
        submissionError={updateMutation.error}
        cancelHref={`/academy/courses/${params.id}`}
        title={headline}
        hasPendingDraft={draft !== null}
        breadcrumb={
          <Link
            href={`/academy/courses/${params.id}`}
            className="hover:text-foreground hover:underline"
          >
            {tCourse("detailBackToList")}
          </Link>
        }
      />
    </div>
  );
}
