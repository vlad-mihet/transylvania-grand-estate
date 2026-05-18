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
  EntryOutlineProvider,
  LocalizedInput,
  LocalizedTextarea,
  LocalizedTiptapEditor,
  MetaField,
  OutlineSidebar,
  SaveStatusIndicator,
  useAutosave,
  useLocaleCompleteness,
} from "@/components/entry-editor";
import { FormActions } from "@/components/shared/form-actions";
import { EmbedPreview } from "@/components/forms/embed-preview";
import { useApiFormErrors } from "@tge/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toast } from "@/lib/toast";
import {
  lessonFormSchema,
  LESSON_TYPES,
  LESSON_STATUSES,
  type LessonFormValues,
} from "@/modules/academy";

interface LessonFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<LessonFormValues>;
  onSubmit: (
    data: LessonFormValues,
    saveMode?: "draft" | "publish",
  ) => void;
  /**
   * Optional secondary submit handler — when provided, renders a "Save & next"
   * button alongside the regular Save. Useful for sequential editing when
   * a next lesson exists in the course. Validation still flows through the
   * same Zod resolver as `onSubmit`.
   */
  onSubmitAndNext?: (data: LessonFormValues) => void;
  /**
   * Optional autosave hook. When provided AND `mode === "edit"`, the form
   * fires this ~2s after the last localized-field keystroke with the three
   * content fields and `mode: "draft"`.
   */
  onAutosave?: (
    payload: Pick<LessonFormValues, "title" | "excerpt" | "content"> & {
      mode: "draft";
    },
  ) => Promise<unknown>;
  loading?: boolean;
  submissionError?: unknown;
  cancelHref: string;
  title: ReactNode;
  breadcrumb?: ReactNode;
  hasPendingDraft?: boolean;
}

const EMPTY_DEFAULTS: LessonFormValues = {
  slug: "",
  order: 10,
  title: { ro: "", en: "", fr: "", de: "" },
  excerpt: { ro: "", en: "", fr: "", de: "" },
  content: { ro: "", en: "", fr: "", de: "" },
  type: "text",
  videoUrl: null,
  videoDurationSeconds: null,
  status: undefined,
};

export function LessonForm({
  mode,
  defaultValues,
  onSubmit,
  onSubmitAndNext,
  onAutosave,
  loading,
  submissionError,
  cancelHref,
  title,
  breadcrumb,
  hasPendingDraft,
}: LessonFormProps) {
  const t = useTranslations("Academy.lessonForm");
  const tLessons = useTranslations("Academy.lessons");
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  useApiFormErrors(form, submissionError, (err) => {
    const message = err instanceof Error ? err.message : "Request failed";
    toast.error(message);
  });
  useUnsavedChangesWarning(form.formState.isDirty && !loading);

  const autosave = useAutosave<
    LessonFormValues,
    Pick<LessonFormValues, "title" | "excerpt" | "content"> & {
      mode: "draft";
    }
  >({
    form,
    watchPaths: ["title", "excerpt", "content"],
    enabled: mode === "edit" && !!onAutosave,
    buildPayload: (values) => {
      if (!values.title?.ro && !values.title?.en) return null;
      return {
        title: values.title,
        excerpt: values.excerpt,
        content: values.content,
        mode: "draft" as const,
      };
    },
    save: async (payload) => {
      if (!onAutosave) return;
      return onAutosave(payload);
    },
  });

  // Cleans payload before invoking either submit handler. Text lessons
  // never carry a videoUrl or videoDurationSeconds; reading time is
  // derived from content on the server. Strip both here so a stale value
  // from toggling type to video and back never makes it over the wire
  // (the service rejects them anyway, but we surface a clean form
  // payload regardless). On create, also drop `status` — newly created
  // lessons start in `draft` server-side.
  const buildPayload = (values: LessonFormValues): LessonFormValues => {
    const cleaned: LessonFormValues =
      values.type === "video"
        ? values
        : { ...values, videoUrl: null, videoDurationSeconds: null };
    if (mode === "create") {
      const { status: _status, ...rest } = cleaned;
      void _status;
      return rest as LessonFormValues;
    }
    return cleaned;
  };

  const submitWithMode = (saveMode: "draft" | "publish") =>
    form.handleSubmit((values) => {
      const payload = buildPayload(values);
      if (mode === "create") {
        onSubmit(payload);
      } else {
        onSubmit(payload, saveMode);
      }
    });

  const submitDraft = submitWithMode("draft");
  const submitPublish = submitWithMode("publish");
  const submitAndNext = onSubmitAndNext
    ? form.handleSubmit((values) => onSubmitAndNext(buildPayload(values)))
    : null;

  return (
    <FormProvider {...form}>
      <EntryLocaleProvider>
        <EntryOutlineProvider>
          <form onSubmit={mode === "edit" ? submitDraft : submitPublish}>
            <LessonFormBody
              mode={mode}
              t={t}
              tLessons={tLessons}
              cancelHref={cancelHref}
              loading={loading}
              dirty={form.formState.isDirty}
              submitAndNext={submitAndNext}
              title={title}
              breadcrumb={breadcrumb}
              hasPendingDraft={hasPendingDraft}
              onPublish={() => void submitPublish()}
              autosaveState={mode === "edit" && onAutosave ? autosave.state : null}
            />
          </form>
        </EntryOutlineProvider>
      </EntryLocaleProvider>
    </FormProvider>
  );
}

interface LessonFormBodyProps {
  mode: "create" | "edit";
  t: ReturnType<typeof useTranslations>;
  tLessons: ReturnType<typeof useTranslations>;
  cancelHref: string;
  loading?: boolean;
  dirty: boolean;
  submitAndNext: (() => Promise<void>) | null;
  title: ReactNode;
  breadcrumb?: ReactNode;
  hasPendingDraft?: boolean;
  onPublish: () => void;
  autosaveState: import("@/components/entry-editor").AutosaveState | null;
}

function LessonFormBody({
  mode,
  t,
  tLessons,
  cancelHref,
  loading,
  dirty,
  submitAndNext,
  title,
  breadcrumb,
  hasPendingDraft,
  onPublish,
  autosaveState,
}: LessonFormBodyProps) {
  const tc = useTranslations("Common");
  const form = useFormContext<LessonFormValues>();
  const lessonType = form.watch("type") ?? "text";
  const videoUrl = form.watch("videoUrl");
  const videoTitle =
    form.watch("title.en") ||
    form.watch("title.ro") ||
    t("videoTitleFallback");
  const { completeness, errorCounts } = useLocaleCompleteness<LessonFormValues>(
    ["title", "excerpt", "content"],
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
      saveStatus={
        autosaveState ? <SaveStatusIndicator state={autosaveState} /> : undefined
      }
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
          secondarySubmit={
            submitAndNext
              ? {
                  label: tLessons("saveAndNext"),
                  onClick: () => void submitAndNext(),
                }
              : undefined
          }
        />
      }
      outline={<OutlineSidebar />}
      localizedFields={
        <>
          <LocalizedInput<LessonFormValues>
            name="title"
            label={t("titleLabel")}
            required
          />
          <LocalizedTextarea<LessonFormValues>
            name="excerpt"
            label={t("excerptLabel")}
            required
            rows={2}
          />
          <LocalizedTiptapEditor<LessonFormValues>
            name="content"
            label={t("contentLabel")}
            required
          />
        </>
      }
      extraSection={
        lessonType === "video" ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
              {t("videoUrlLabel")} preview
            </p>
            <EmbedPreview url={videoUrl} title={videoTitle} />
          </div>
        ) : undefined
      }
      metadataFields={<LessonMetadataFields mode={mode} t={t} />}
    />
  );
}

function LessonMetadataFields({
  mode,
  t,
}: {
  mode: "create" | "edit";
  t: ReturnType<typeof useTranslations>;
}) {
  const tStatus = useTranslations("Academy.statuses");
  const tType = useTranslations("Academy.lessonTypes");
  const form = useFormContext<LessonFormValues>();
  const lessonType = form.watch("type") ?? "text";

  return (
    <>
      <MetaField
        id="lesson-slug"
        label={t("slugLabel")}
        error={form.formState.errors.slug?.message}
      >
        <Input
          id="lesson-slug"
          {...form.register("slug")}
          placeholder={t("slugPlaceholder")}
          className="mono"
        />
      </MetaField>

      <MetaField
        id="lesson-order"
        label={t("orderLabel")}
        helper={t("orderHelper")}
      >
        <Input
          id="lesson-order"
          type="number"
          min={0}
          {...form.register("order", { valueAsNumber: true })}
          className="mono"
        />
      </MetaField>

      <MetaField id="lesson-type" label={t("typeLabel")}>
        <Select
          value={lessonType}
          onValueChange={(v) =>
            form.setValue("type", v as LessonFormValues["type"], {
              shouldDirty: true,
            })
          }
        >
          <SelectTrigger id="lesson-type">
            <SelectValue placeholder={t("typePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {LESSON_TYPES.map((lt) => (
              <SelectItem key={lt} value={lt}>
                {tType(lt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </MetaField>

      {lessonType === "video" ? (
        <>
          <MetaField
            id="lesson-video-url"
            label={t("videoUrlLabel")}
            helper={t("videoUrlHelper")}
          >
            <Input
              id="lesson-video-url"
              type="url"
              {...form.register("videoUrl")}
              placeholder={t("videoUrlPlaceholder")}
            />
          </MetaField>

          <MetaField
            id="lesson-video-duration"
            label={t("videoDurationLabel")}
            helper={t("videoDurationHelper")}
          >
            <Input
              id="lesson-video-duration"
              type="number"
              min={1}
              max={14400}
              {...form.register("videoDurationSeconds", {
                setValueAs: (v) =>
                  v === "" || v === null || v === undefined ? null : Number(v),
              })}
              placeholder={t("videoDurationPlaceholder")}
              className="mono"
            />
          </MetaField>
        </>
      ) : null}

      {mode === "edit" ? (
        <MetaField id="lesson-status" label={t("statusLabel")}>
          <Select
            value={form.watch("status") ?? "draft"}
            onValueChange={(v) =>
              form.setValue("status", v as LessonFormValues["status"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger id="lesson-status">
              <SelectValue placeholder={t("statusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {LESSON_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {tStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetaField>
      ) : null}
    </>
  );
}

export { EMPTY_DEFAULTS as EMPTY_LESSON_DEFAULTS };
