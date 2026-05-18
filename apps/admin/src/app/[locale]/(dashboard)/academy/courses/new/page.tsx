"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { CourseForm } from "@/modules/academy/forms/course-form";
import {
  useCreateCourse,
  useUploadCourseCover,
  type CourseFormValues,
} from "@/modules/academy";

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

  const createCourse = useCreateCourse();
  const uploadCover = useUploadCourseCover();

  // Sequenced flow: create then best-effort cover upload. A cover upload
  // failure surfaces via toast but does not discard the new course — the
  // user can retry from the edit page's live uploader.
  const createMutation = useMutation({
    mutationFn: async (input: CourseFormValues) => {
      const course = await createCourse.mutateAsync(input);
      if (stagedCoverFile) {
        try {
          await uploadCover.mutateAsync({ id: course.id, file: stagedCoverFile });
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
