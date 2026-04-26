"use client";

import { useEffect } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { CourseForm } from "@/components/forms/course-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { LoadingState } from "@tge/ui";
import type { CourseFormValues } from "@/lib/validations/academy";
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
};

export default function EditAcademyCoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("Academy.courses");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("academy.course.update")) router.replace(`/${locale}/403`);
  }, [can, router, locale]);

  const courseQuery = useQuery({
    queryKey: ["academy-course", params.id],
    queryFn: () => apiClient<Course>(`/admin/academy/courses/${params.id}`),
  });

  const updateMutation = useMutation({
    mutationFn: (input: CourseFormValues) =>
      apiClient<Course>(`/admin/academy/courses/${params.id}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ["academy-course", params.id] });
      queryClient.invalidateQueries({ queryKey: ["academy-courses"] });
      toast.success(tt("courseSaved"));
      router.push(`/${locale}/academy/courses/${course.id}`);
    },
  });

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
  const defaults: Partial<CourseFormValues> = {
    slug: course.slug,
    title: {
      ro: course.title.ro ?? "",
      en: course.title.en ?? "",
      fr: course.title.fr,
      de: course.title.de,
    },
    description: {
      ro: course.description.ro ?? "",
      en: course.description.en ?? "",
      fr: course.description.fr,
      de: course.description.de,
    },
    coverImage: course.coverImage ?? undefined,
    status: course.status,
    visibility: course.visibility,
    order: course.order,
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
          {t("detailBackToList")}
        </Link>
      }
    >
      <CourseForm
        mode="edit"
        courseId={params.id}
        defaultValues={defaults}
        onSubmit={(values) => updateMutation.mutate(values)}
        loading={updateMutation.isPending}
        submissionError={updateMutation.error}
        cancelHref={`/academy/courses/${params.id}`}
      />
    </FormPageShell>
  );
}
