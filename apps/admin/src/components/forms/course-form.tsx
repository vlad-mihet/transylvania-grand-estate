"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { useTranslations } from "next-intl";
import { BilingualInput } from "@/components/shared/bilingual-input";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";
import { SectionCard } from "@/components/shared/section-card";
import { FormActions } from "@/components/shared/form-actions";
import { CoverImageField } from "@/components/academy/cover-image-field";
import { useApiFormErrors } from "@/lib/form-error";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toast } from "@/lib/toast";
import {
  courseFormSchema,
  COURSE_STATUSES,
  type CourseFormValues,
} from "@/lib/validations/academy";

interface CourseFormProps {
  mode: "create" | "edit";
  /**
   * Required in edit mode so the cover-image dropzone can POST to the
   * existing course. Omitted on create because the course row doesn't
   * exist yet — the URL input is the fallback there.
   */
  courseId?: string;
  defaultValues?: Partial<CourseFormValues>;
  onSubmit: (data: CourseFormValues) => void;
  loading?: boolean;
  submissionError?: unknown;
  cancelHref: string;
}

const EMPTY_DEFAULTS: CourseFormValues = {
  slug: "",
  title: { ro: "", en: "", fr: "", de: "" },
  description: { ro: "", en: "", fr: "", de: "" },
  coverImage: undefined,
  order: undefined,
  status: undefined,
};

export function CourseForm({
  mode,
  courseId,
  defaultValues,
  onSubmit,
  loading,
  submissionError,
  cancelHref,
}: CourseFormProps) {
  const t = useTranslations("Academy.courseForm");
  const tStatus = useTranslations("Academy.statuses");
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  useApiFormErrors(form, submissionError, (err) => {
    const message = err instanceof Error ? err.message : "Request failed";
    toast.error(message);
  });
  useUnsavedChangesWarning(form.formState.isDirty && !loading);

  const submit = form.handleSubmit((values) => {
    if (mode === "create") {
      const { status: _status, ...rest } = values;
      void _status;
      onSubmit(rest);
      return;
    }
    onSubmit(values);
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <SectionCard title={t("basicsTitle")} description={t("basicsDescription")}>
        <div className="flex flex-col gap-5">
          <div>
            <Label htmlFor="course-slug">{t("slugLabel")}</Label>
            <Input
              id="course-slug"
              {...form.register("slug")}
              placeholder={t("slugPlaceholder")}
              className="mono mt-1.5"
            />
            {form.formState.errors.slug ? (
              <p className="mt-1 text-xs text-[var(--color-danger)]">
                {form.formState.errors.slug.message}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {t("slugHelper")}
            </p>
          </div>

          <BilingualInput
            label={t("titleLabel")}
            valueRo={form.watch("title.ro") ?? ""}
            valueEn={form.watch("title.en") ?? ""}
            valueFr={form.watch("title.fr") ?? ""}
            valueDe={form.watch("title.de") ?? ""}
            onChangeRo={(v) =>
              form.setValue("title.ro", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeEn={(v) =>
              form.setValue("title.en", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeFr={(v) =>
              form.setValue("title.fr", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeDe={(v) =>
              form.setValue("title.de", v, { shouldValidate: true, shouldDirty: true })
            }
            required
          />

          <BilingualTextarea
            label={t("descriptionLabel")}
            valueRo={form.watch("description.ro") ?? ""}
            valueEn={form.watch("description.en") ?? ""}
            valueFr={form.watch("description.fr") ?? ""}
            valueDe={form.watch("description.de") ?? ""}
            onChangeRo={(v) =>
              form.setValue("description.ro", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeEn={(v) =>
              form.setValue("description.en", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeFr={(v) =>
              form.setValue("description.fr", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeDe={(v) =>
              form.setValue("description.de", v, { shouldValidate: true, shouldDirty: true })
            }
            required
            rows={4}
          />

          <div>
            <Label htmlFor="course-cover">{t("coverImageLabel")}</Label>
            {mode === "edit" && courseId ? (
              <div className="mt-1.5">
                <CoverImageField
                  courseId={courseId}
                  value={form.watch("coverImage") ?? null}
                  onChange={(next) =>
                    form.setValue("coverImage", next ?? undefined, {
                      shouldDirty: true,
                    })
                  }
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("coverImageUploadHelper")}
                </p>
              </div>
            ) : (
              <>
                <Input
                  id="course-cover"
                  {...form.register("coverImage")}
                  placeholder={t("coverImageUrlPlaceholder")}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("coverImageUrlHelper")}
                </p>
              </>
            )}
          </div>
        </div>
      </SectionCard>

      {mode === "edit" ? (
        <SectionCard
          title={t("publishingTitle")}
          description={t("publishingDescription")}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <Label htmlFor="course-status">{t("statusLabel")}</Label>
              <Select
                value={form.watch("status") ?? "draft"}
                onValueChange={(v) =>
                  form.setValue("status", v as CourseFormValues["status"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="course-status" className="mt-1.5">
                  <SelectValue placeholder={t("statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="course-order">{t("orderLabel")}</Label>
              <Input
                id="course-order"
                type="number"
                min={0}
                {...form.register("order", { valueAsNumber: true })}
                className="mono mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("orderHelper")}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <FormActions
        cancelHref={cancelHref}
        loading={loading}
        dirty={form.formState.isDirty}
        submitLabel={mode === "create" ? t("submitCreate") : t("submitEdit")}
      />
    </form>
  );
}

export { EMPTY_DEFAULTS as EMPTY_COURSE_DEFAULTS };
