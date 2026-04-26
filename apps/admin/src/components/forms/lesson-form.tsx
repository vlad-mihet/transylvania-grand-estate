"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
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
import { BilingualMarkdownEditor } from "@/components/shared/bilingual-markdown-editor";
import { SectionCard } from "@/components/shared/section-card";
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
} from "@/lib/validations/academy";

interface LessonFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<LessonFormValues>;
  onSubmit: (data: LessonFormValues) => void;
  loading?: boolean;
  submissionError?: unknown;
  cancelHref: string;
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
  loading,
  submissionError,
  cancelHref,
}: LessonFormProps) {
  const t = useTranslations("Academy.lessonForm");
  const tStatus = useTranslations("Academy.statuses");
  const tType = useTranslations("Academy.lessonTypes");
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  useApiFormErrors(form, submissionError, (err) => {
    const message = err instanceof Error ? err.message : "Request failed";
    toast.error(message);
  });
  useUnsavedChangesWarning(form.formState.isDirty && !loading);

  const type = form.watch("type") ?? "text";

  const submit = form.handleSubmit((values) => {
    // Text lessons never carry a videoUrl or videoDurationSeconds;
    // reading time is derived from content on the server. Strip both
    // here so a stale value from toggling type to video and back never
    // makes it over the wire (the service rejects them anyway, but we
    // surface a clean form payload regardless).
    const cleaned: LessonFormValues =
      values.type === "video"
        ? values
        : { ...values, videoUrl: null, videoDurationSeconds: null };
    if (mode === "create") {
      const { status: _status, ...rest } = cleaned;
      void _status;
      onSubmit(rest);
      return;
    }
    onSubmit(cleaned);
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <SectionCard title={t("basicsTitle")} description={t("basicsDescription")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="lesson-slug">{t("slugLabel")}</Label>
            <Input
              id="lesson-slug"
              {...form.register("slug")}
              placeholder={t("slugPlaceholder")}
              className="mono mt-1.5"
            />
            {form.formState.errors.slug ? (
              <p className="mt-1 text-xs text-[var(--color-danger)]">
                {form.formState.errors.slug.message}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="lesson-order">{t("orderLabel")}</Label>
            <Input
              id="lesson-order"
              type="number"
              min={0}
              {...form.register("order", { valueAsNumber: true })}
              className="mono mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("orderHelper")}
            </p>
          </div>

          <div>
            <Label htmlFor="lesson-type">{t("typeLabel")}</Label>
            <Select
              value={type}
              onValueChange={(v) =>
                form.setValue("type", v as LessonFormValues["type"], {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="lesson-type" className="mt-1.5">
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
          </div>

          {type === "video" ? (
            <>
              <div className="sm:col-span-2">
                <Label htmlFor="lesson-video-url">{t("videoUrlLabel")}</Label>
                <Input
                  id="lesson-video-url"
                  type="url"
                  {...form.register("videoUrl")}
                  placeholder={t("videoUrlPlaceholder")}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("videoUrlHelper")}
                </p>
                <EmbedPreview
                  url={form.watch("videoUrl")}
                  title={
                    form.watch("title.en") ||
                    form.watch("title.ro") ||
                    t("videoTitleFallback")
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="lesson-video-duration">
                  {t("videoDurationLabel")}
                </Label>
                <Input
                  id="lesson-video-duration"
                  type="number"
                  min={1}
                  max={14400}
                  {...form.register("videoDurationSeconds", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined
                        ? null
                        : Number(v),
                  })}
                  placeholder={t("videoDurationPlaceholder")}
                  className="mono mt-1.5 max-w-[160px]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("videoDurationHelper")}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title={t("copyTitle")} description={t("copyDescription")}>
        <div className="flex flex-col gap-5">
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
            label={t("excerptLabel")}
            valueRo={form.watch("excerpt.ro") ?? ""}
            valueEn={form.watch("excerpt.en") ?? ""}
            valueFr={form.watch("excerpt.fr") ?? ""}
            valueDe={form.watch("excerpt.de") ?? ""}
            onChangeRo={(v) =>
              form.setValue("excerpt.ro", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeEn={(v) =>
              form.setValue("excerpt.en", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeFr={(v) =>
              form.setValue("excerpt.fr", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeDe={(v) =>
              form.setValue("excerpt.de", v, { shouldValidate: true, shouldDirty: true })
            }
            required
            rows={2}
          />

          <BilingualMarkdownEditor
            label={t("contentLabel")}
            valueRo={form.watch("content.ro") ?? ""}
            valueEn={form.watch("content.en") ?? ""}
            valueFr={form.watch("content.fr") ?? ""}
            valueDe={form.watch("content.de") ?? ""}
            onChangeRo={(v) =>
              form.setValue("content.ro", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeEn={(v) =>
              form.setValue("content.en", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeFr={(v) =>
              form.setValue("content.fr", v, { shouldValidate: true, shouldDirty: true })
            }
            onChangeDe={(v) =>
              form.setValue("content.de", v, { shouldValidate: true, shouldDirty: true })
            }
            required
            rows={14}
          />
        </div>
      </SectionCard>

      {mode === "edit" ? (
        <SectionCard
          title={t("publishingTitle")}
          description={t("publishingDescription")}
        >
          <div>
            <Label htmlFor="lesson-status">{t("statusLabel")}</Label>
            <Select
              value={form.watch("status") ?? "draft"}
              onValueChange={(v) =>
                form.setValue("status", v as LessonFormValues["status"], {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="lesson-status" className="mt-1.5 sm:max-w-xs">
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

export { EMPTY_DEFAULTS as EMPTY_LESSON_DEFAULTS };
