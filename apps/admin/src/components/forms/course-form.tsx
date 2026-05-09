"use client";

import type { ReactNode } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { useTranslations } from "next-intl";
import {
  EntryEditorShell,
  EntryLocaleProvider,
  LocalizedInput,
  LocalizedTextarea,
  MetaField,
  useLocaleCompleteness,
} from "@/components/entry-editor";
import { FormActions } from "@/components/shared/form-actions";
import { CoverImageField } from "@/components/academy/cover-image-field";
import { StagedCoverImageField } from "@/components/academy/staged-cover-image-field";
import { useApiFormErrors } from "@tge/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toast } from "@/lib/toast";
import {
  courseFormSchema,
  COURSE_STATUSES,
  COURSE_VISIBILITIES,
  type CourseFormValues,
} from "@/lib/validations/academy";

interface CourseFormProps {
  mode: "create" | "edit";
  /**
   * Required in edit mode so the cover-image dropzone can POST to the
   * existing course. Omitted on create — the staged uploader holds the
   * picked file in parent state and uploads after the course is created.
   */
  courseId?: string;
  defaultValues?: Partial<CourseFormValues>;
  onSubmit: (
    data: CourseFormValues,
    saveMode?: "draft" | "publish",
  ) => void;
  loading?: boolean;
  submissionError?: unknown;
  cancelHref: string;
  /** Create-mode only — staged cover file lifted to parent for post-create upload. */
  stagedCoverFile?: File | null;
  onStagedCoverFileChange?: (file: File | null) => void;
  title: ReactNode;
  breadcrumb?: ReactNode;
  hasPendingDraft?: boolean;
}

const EMPTY_DEFAULTS: CourseFormValues = {
  slug: "",
  title: { ro: "", en: "", fr: "", de: "" },
  description: { ro: "", en: "", fr: "", de: "" },
  coverImage: undefined,
  visibility: "enrolled",
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
  stagedCoverFile,
  onStagedCoverFileChange,
  title,
  breadcrumb,
  hasPendingDraft,
}: CourseFormProps) {
  const t = useTranslations("Academy.courseForm");
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  useApiFormErrors(form, submissionError, (err) => {
    const message = err instanceof Error ? err.message : "Request failed";
    toast.error(message);
  });
  useUnsavedChangesWarning(form.formState.isDirty && !loading);

  const submitWithMode = (saveMode: "draft" | "publish") =>
    form.handleSubmit((values) => {
      if (mode === "create") {
        const { status: _status, ...rest } = values;
        void _status;
        onSubmit(rest);
        return;
      }
      onSubmit(values, saveMode);
    });

  const submitDraft = submitWithMode("draft");
  const submitPublish = submitWithMode("publish");

  return (
    <FormProvider {...form}>
      <EntryLocaleProvider>
        <form onSubmit={mode === "edit" ? submitDraft : submitPublish}>
          <CourseFormBody
            mode={mode}
            courseId={courseId}
            t={t}
            cancelHref={cancelHref}
            loading={loading}
            dirty={form.formState.isDirty}
            stagedCoverFile={stagedCoverFile}
            onStagedCoverFileChange={onStagedCoverFileChange}
            title={title}
            breadcrumb={breadcrumb}
            hasPendingDraft={hasPendingDraft}
            onPublish={() => void submitPublish()}
          />
        </form>
      </EntryLocaleProvider>
    </FormProvider>
  );
}

interface CourseFormBodyProps {
  mode: "create" | "edit";
  courseId?: string;
  t: ReturnType<typeof useTranslations>;
  cancelHref: string;
  loading?: boolean;
  dirty: boolean;
  stagedCoverFile?: File | null;
  onStagedCoverFileChange?: (file: File | null) => void;
  title: ReactNode;
  breadcrumb?: ReactNode;
  hasPendingDraft?: boolean;
  onPublish: () => void;
}

function CourseFormBody({
  mode,
  courseId,
  t,
  cancelHref,
  loading,
  dirty,
  stagedCoverFile,
  onStagedCoverFileChange,
  title,
  breadcrumb,
  hasPendingDraft,
  onPublish,
}: CourseFormBodyProps) {
  const tc = useTranslations("Common");
  const { completeness, errorCounts } = useLocaleCompleteness<CourseFormValues>(
    ["title", "description"],
  );
  const isEdit = mode === "edit";

  return (
    <EntryEditorShell
      title={
        <span className="flex items-center gap-2">
          {title}
          {hasPendingDraft ? (
            <span className="inline-flex items-center rounded-sm bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-warning">
              {tc("draftPending")}
            </span>
          ) : null}
        </span>
      }
      breadcrumb={breadcrumb}
      unsavedDirty={dirty}
      switcherCompleteness={completeness}
      switcherErrorCounts={errorCounts}
      actions={
        <FormActions
          cancelHref={cancelHref}
          loading={loading}
          dirty={dirty}
          submitLabel={
            isEdit ? tc("saveDraft") : t("submitCreate")
          }
          publishAction={
            isEdit ? { label: tc("publish"), onClick: onPublish } : undefined
          }
        />
      }
      localizedFields={
        <>
          <LocalizedInput<CourseFormValues>
            name="title"
            label={t("titleLabel")}
            required
          />
          <LocalizedTextarea<CourseFormValues>
            name="description"
            label={t("descriptionLabel")}
            required
            rows={6}
          />
        </>
      }
      metadataFields={
        <CourseMetadataFields
          mode={mode}
          courseId={courseId}
          t={t}
          stagedCoverFile={stagedCoverFile}
          onStagedCoverFileChange={onStagedCoverFileChange}
        />
      }
    />
  );
}

function CourseMetadataFields({
  mode,
  courseId,
  t,
  stagedCoverFile,
  onStagedCoverFileChange,
}: {
  mode: "create" | "edit";
  courseId?: string;
  t: ReturnType<typeof useTranslations>;
  stagedCoverFile?: File | null;
  onStagedCoverFileChange?: (file: File | null) => void;
}) {
  const tStatus = useTranslations("Academy.statuses");
  const tVisibility = useTranslations("Academy.visibilities");
  const form = useFormContext<CourseFormValues>();

  return (
    <>
      <MetaField
        id="course-slug"
        label={t("slugLabel")}
        helper={t("slugHelper")}
        error={form.formState.errors.slug?.message}
      >
        <Input
          id="course-slug"
          {...form.register("slug")}
          placeholder={t("slugPlaceholder")}
          className="mono"
        />
      </MetaField>

      <MetaField id="course-cover" label={t("coverImageLabel")}>
        {mode === "edit" && courseId ? (
          <CoverImageField
            courseId={courseId}
            value={form.watch("coverImage") ?? null}
            onChange={(next) =>
              form.setValue("coverImage", next ?? undefined, {
                shouldDirty: true,
              })
            }
          />
        ) : (
          <StagedCoverImageField
            file={stagedCoverFile ?? null}
            onFileChange={(next) => onStagedCoverFileChange?.(next)}
          />
        )}
        <p className="text-[11px] text-muted-foreground">
          {mode === "edit"
            ? t("coverImageUploadHelper")
            : t("coverImageStagedHelper")}
        </p>
      </MetaField>

      <MetaField
        id="course-visibility"
        label={t("visibilityLabel")}
        helper={t("visibilityHelper")}
      >
        <Select
          value={form.watch("visibility") ?? "enrolled"}
          onValueChange={(v) =>
            form.setValue("visibility", v as CourseFormValues["visibility"], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="course-visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COURSE_VISIBILITIES.map((v) => (
              <SelectItem key={v} value={v}>
                {tVisibility(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </MetaField>

      {mode === "edit" ? (
        <>
          <MetaField id="course-status" label={t("statusLabel")}>
            <Select
              value={form.watch("status") ?? "draft"}
              onValueChange={(v) =>
                form.setValue("status", v as CourseFormValues["status"], {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="course-status">
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
          </MetaField>

          <MetaField
            id="course-order"
            label={t("orderLabel")}
            helper={t("orderHelper")}
          >
            <Input
              id="course-order"
              type="number"
              min={0}
              {...form.register("order", { valueAsNumber: true })}
              className="mono"
            />
          </MetaField>
        </>
      ) : null}
    </>
  );
}

export { EMPTY_DEFAULTS as EMPTY_COURSE_DEFAULTS };
