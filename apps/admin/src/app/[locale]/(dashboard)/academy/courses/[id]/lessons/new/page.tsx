"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { LessonForm } from "@/components/forms/lesson-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { LoadingState } from "@tge/ui";
import type { LessonFormValues } from "@/lib/validations/academy";

type Lesson = { id: string };

export default function NewAcademyLessonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Academy.lessonForm");
  const tCourse = useTranslations("Academy.courses");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("academy.lesson.create")) router.replace(`/${locale}/403`);
  }, [can, router, locale]);

  // Pre-fetch the next sparse order so the admin doesn't have to guess.
  const nextOrderQuery = useQuery({
    queryKey: ["academy-lessons-next-order", params.id],
    queryFn: () =>
      apiClient<{ order: number }>(
        `/admin/academy/courses/${params.id}/lessons/next-order`,
      ),
  });

  const createMutation = useMutation({
    mutationFn: (input: LessonFormValues) =>
      apiClient<Lesson>(`/admin/academy/courses/${params.id}/lessons`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      toast.success(tt("lessonCreated"));
      router.push(`/${locale}/academy/courses/${params.id}`);
    },
  });

  if (!can("academy.lesson.create")) return null;

  if (nextOrderQuery.isLoading) {
    return <LoadingState label={tc("loading")} />;
  }

  const order = nextOrderQuery.data?.order ?? 10;

  return (
    <FormPageShell
      title={t("createTitle")}
      description={t("createDescription", { order })}
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
        mode="create"
        defaultValues={{ order }}
        onSubmit={(values) => createMutation.mutate(values)}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
        cancelHref={`/academy/courses/${params.id}`}
      />
    </FormPageShell>
  );
}
