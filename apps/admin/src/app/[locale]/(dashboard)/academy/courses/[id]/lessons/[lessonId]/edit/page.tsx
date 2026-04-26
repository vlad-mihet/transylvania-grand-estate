"use client";

import { useParams, useRouter, notFound } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { LessonForm } from "@/components/forms/lesson-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { LoadingState } from "@tge/ui";
import type { LessonFormValues } from "@/lib/validations/academy";
import type { LessonStatus, LessonType } from "@prisma/client";

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
};

export default function EditAcademyLessonPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("Academy.lessonForm");
  const tCourse = useTranslations("Academy.courses");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");

  const lessonQuery = useQuery({
    queryKey: ["academy-lesson", params.lessonId],
    queryFn: () =>
      apiClient<Lesson>(
        `/admin/academy/courses/${params.id}/lessons/${params.lessonId}`,
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (input: LessonFormValues) =>
      apiClient<Lesson>(
        `/admin/academy/courses/${params.id}/lessons/${params.lessonId}`,
        {
          method: "PATCH",
          body: input,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["academy-lesson", params.lessonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["academy-lessons", params.id],
      });
      toast.success(tt("lessonSaved"));
      router.push(`/${locale}/academy/courses/${params.id}`);
    },
  });

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
  const defaults: Partial<LessonFormValues> = {
    slug: lesson.slug,
    order: lesson.order,
    title: {
      ro: lesson.title.ro ?? "",
      en: lesson.title.en ?? "",
      fr: lesson.title.fr,
      de: lesson.title.de,
    },
    excerpt: {
      ro: lesson.excerpt.ro ?? "",
      en: lesson.excerpt.en ?? "",
      fr: lesson.excerpt.fr,
      de: lesson.excerpt.de,
    },
    content: {
      ro: lesson.content.ro ?? "",
      en: lesson.content.en ?? "",
      fr: lesson.content.fr,
      de: lesson.content.de,
    },
    type: lesson.type,
    videoUrl: lesson.videoUrl,
    videoDurationSeconds: lesson.videoDurationSeconds,
    status: lesson.status,
  };

  return (
    <FormPageShell
      title={t("editTitle")}
      description={t("editDescription")}
      breadcrumb={
        <Link
          href={`/academy/courses/${params.id}`}
          className="hover:text-foreground hover:underline"
        >
          {tCourse("detailBackToList")}
        </Link>
      }
    >
      <LessonForm
        mode="edit"
        defaultValues={defaults}
        onSubmit={(values) => updateMutation.mutate(values)}
        loading={updateMutation.isPending}
        submissionError={updateMutation.error}
        cancelHref={`/academy/courses/${params.id}`}
      />
    </FormPageShell>
  );
}
