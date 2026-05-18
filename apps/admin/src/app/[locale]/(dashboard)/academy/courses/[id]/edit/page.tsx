"use client";

import { useEffect } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { CourseForm } from "@/modules/academy/forms/course-form";
import { LoadingState } from "@tge/ui";
import {
  useAcademyCourse,
  useUpdateCourse,
  type CourseFormValues,
} from "@/modules/academy";
import type { CourseStatus, CourseVisibility } from "@prisma/client";

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  description: Record<string, string | undefined>;
  coverImage: string | null;
  status: CourseStatus;
  visibility: CourseVisibility;
  order: number;
  draft?: {
    title?: Record<string, string | undefined>;
    description?: Record<string, string | undefined>;
  } | null;
};

export default function EditAcademyCoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Academy.courses");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("academy.course.update")) router.replace(`/${locale}/403`);
  }, [can, router, locale]);

  const courseQuery = useAcademyCourse<Course>(params.id);
  const updateMutation = useUpdateCourse();

  const handleSubmit = (
    values: CourseFormValues,
    saveMode?: "draft" | "publish",
  ) =>
    updateMutation.mutate(
      { id: params.id, body: { ...values, mode: saveMode } },
      {
        onSuccess: (course) => {
          toast.success(tt("courseSaved"));
          router.push(`/${locale}/academy/courses/${course.id}`);
        },
      },
    );

  if (!can("academy.course.update")) return null;

  if (courseQuery.isLoading) {
    return <LoadingState label={tc("loading")} />;
  }
  if (courseQuery.isError) {
    const err = courseQuery.error;
    if (err instanceof ApiError && err.status === 404) notFound();
  }
  if (!courseQuery.data) {
    notFound();
  }

  const course = courseQuery.data;
  const draft = course.draft ?? null;
  const titleSource = draft?.title ?? course.title;
  const descriptionSource = draft?.description ?? course.description;
  const defaults: Partial<CourseFormValues> = {
    slug: course.slug,
    title: {
      ro: titleSource.ro ?? "",
      en: titleSource.en ?? "",
      fr: titleSource.fr,
      de: titleSource.de,
    },
    description: {
      ro: descriptionSource.ro ?? "",
      en: descriptionSource.en ?? "",
      fr: descriptionSource.fr,
      de: descriptionSource.de,
    },
    coverImage: course.coverImage ?? undefined,
    status: course.status,
    visibility: course.visibility,
    order: course.order,
  };

  const headline = course.title.ro || course.title.en || course.slug;

  return (
    <CourseForm
      mode="edit"
      courseId={params.id}
      defaultValues={defaults}
      onSubmit={handleSubmit}
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
          {t("detailBackToList")}
        </Link>
      }
    />
  );
}
