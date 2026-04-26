"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { CourseForm } from "@/components/forms/course-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import type { CourseFormValues } from "@/lib/validations/academy";

type Course = { id: string; slug: string };

export default function NewAcademyCoursePage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Academy.courses");
  const tt = useTranslations("Academy.toasts");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("academy.course.create")) router.replace(`/${locale}/403`);
  }, [can, router, locale]);

  const createMutation = useMutation({
    mutationFn: (input: CourseFormValues) =>
      apiClient<Course>("/admin/academy/courses", {
        method: "POST",
        body: input,
      }),
    onSuccess: (course) => {
      toast.success(tt("courseCreated"));
      router.push(`/${locale}/academy/courses/${course.id}`);
    },
  });

  if (!can("academy.course.create")) return null;

  return (
    <FormPageShell
      title={t("createTitle")}
      description={t("createDescription")}
      breadcrumb={
        <Link
          href="/academy/courses"
          className="hover:text-foreground hover:underline"
        >
          {t("detailBackToList")}
        </Link>
      }
    >
      <CourseForm
        mode="create"
        onSubmit={(values) => createMutation.mutate(values)}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
        cancelHref="/academy/courses"
      />
    </FormPageShell>
  );
}
