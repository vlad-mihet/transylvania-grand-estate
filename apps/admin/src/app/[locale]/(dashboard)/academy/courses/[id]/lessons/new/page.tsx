"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { LessonForm } from "@/modules/academy/forms/lesson-form";
import { LoadingState } from "@tge/ui";
import {
  useCreateLesson,
  useLessonNextOrder,
  type LessonFormValues,
} from "@/modules/academy";

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

  const nextOrderQuery = useLessonNextOrder(params.id);
  const createMutation = useCreateLesson(params.id);

  const handleSubmit = (values: LessonFormValues) =>
    createMutation.mutate(values, {
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
    <LessonForm
      mode="create"
      defaultValues={{ order }}
      onSubmit={handleSubmit}
      loading={createMutation.isPending}
      submissionError={createMutation.error}
      cancelHref={`/academy/courses/${params.id}`}
      title={t("createTitle")}
      breadcrumb={
        <Link
          href={`/academy/courses/${params.id}`}
          className="hover:text-foreground hover:underline"
        >
          {tCourse("detailBackToList")}
        </Link>
      }
    />
  );
}
