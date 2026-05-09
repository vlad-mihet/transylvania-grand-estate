"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { CourseForm } from "@/components/forms/course-form";
import type { CourseFormValues } from "@/lib/validations/academy";

type Course = { id: string; slug: string };

export default function NewAcademyCoursePage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Academy.courses");
  const tt = useTranslations("Academy.toasts");
  const { can } = usePermissions();

  const [stagedCoverFile, setStagedCoverFile] = useState<File | null>(null);

  useEffect(() => {
    if (!can("academy.course.create")) router.replace(`/${locale}/403`);
  }, [can, router, locale]);

  const createMutation = useMutation({
    mutationFn: async (input: CourseFormValues) => {
      const course = await apiClient<Course>("/admin/academy/courses", {
        method: "POST",
        body: input,
      });
      // Cover-image upload is best-effort: a failure here shouldn't
      // discard the just-created course. We surface the error via toast
      // and let the user retry from edit mode where the live uploader
      // takes over.
      if (stagedCoverFile) {
        try {
          const formData = new FormData();
          formData.append("image", stagedCoverFile);
          await apiClient(
            `/admin/academy/courses/${course.id}/cover-image`,
            { method: "POST", body: formData },
          );
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Course created, but cover upload failed",
          );
        }
      }
      return course;
    },
    onSuccess: (course) => {
      toast.success(tt("courseCreated"));
      router.push(`/${locale}/academy/courses/${course.id}`);
    },
  });

  if (!can("academy.course.create")) return null;

  return (
    <CourseForm
      mode="create"
      onSubmit={(values) => createMutation.mutate(values)}
      loading={createMutation.isPending}
      submissionError={createMutation.error}
      cancelHref="/academy/courses"
      stagedCoverFile={stagedCoverFile}
      onStagedCoverFileChange={setStagedCoverFile}
      title={t("createTitle")}
      breadcrumb={
        <Link
          href="/academy/courses"
          className="hover:text-foreground hover:underline"
        >
          {t("detailBackToList")}
        </Link>
      }
    />
  );
}
