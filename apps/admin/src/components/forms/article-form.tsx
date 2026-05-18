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
import { TagsInput } from "@/components/forms/tags-input";
import { useApiFormErrors } from "@tge/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toast } from "@/lib/toast";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  articleFormSchema,
  type ArticleFormValues,
} from "@/lib/validations/articles";

interface ArticleFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<ArticleFormValues>;
  /**
   * Receives the form values plus the save mode chosen by the editor:
   * "draft" persists localized fields under the entry's `draft` JSON
   * column without touching live; "publish" promotes localized fields
   * to live and clears any pending draft. Create-mode never carries a
   * draft — newly created articles always start as a published-or-draft
   * status row decided by the entity service.
   */
  onSubmit: (
    data: ArticleFormValues,
    saveMode?: "draft" | "publish",
  ) => void;
  /**
   * Optional autosave hook. When provided AND `mode === "edit"`, the form
   * fires this callback ~2s after the last localized-field keystroke with
   * `{ title, excerpt, content, mode: "draft" }`. Should resolve on success
   * and reject on failure so the SaveStatusIndicator can surface state.
   */
  onAutosave?: (
    payload: Pick<ArticleFormValues, "title" | "excerpt" | "content"> & {
      mode: "draft";
    },
  ) => Promise<unknown>;
  loading?: boolean;
  submissionError?: unknown;
  cancelHref: string;
  /** Display title rendered in the shell's sticky top bar. */
  title: ReactNode;
  /** Optional breadcrumb above the title. */
  breadcrumb?: ReactNode;
  /** True if the loaded entry has a pending draft (draft column non-null). */
  hasPendingDraft?: boolean;
}

const EMPTY_DEFAULTS: ArticleFormValues = {
  slug: "",
  title: { ro: "", en: "", fr: "", de: "" },
  excerpt: { ro: "", en: "", fr: "", de: "" },
  content: { ro: "", en: "", fr: "", de: "" },
  coverImage: "",
  category: "guide",
  tags: [],
  authorName: "",
  authorAvatar: undefined,
  readTimeMinutes: undefined,
  status: undefined,
};

export function ArticleForm({
  mode,
  defaultValues,
  onSubmit,
  onAutosave,
  loading,
  submissionError,
  cancelHref,
  title,
  breadcrumb,
  hasPendingDraft,
}: ArticleFormProps) {
  const t = useTranslations("Articles.articleForm");

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  useApiFormErrors(form, submissionError, (err) => {
    const message = err instanceof Error ? err.message : "Request failed";
    toast.error(message);
  });
  useUnsavedChangesWarning(form.formState.isDirty && !loading);

  const autosave = useAutosave<
    ArticleFormValues,
    Pick<ArticleFormValues, "title" | "excerpt" | "content"> & {
      mode: "draft";
    }
  >({
    form,
    watchPaths: ["title", "excerpt", "content"],
    enabled: mode === "edit" && !!onAutosave,
    buildPayload: (values) => {
      // Skip the tick when the primary-locale title is empty — the server
      // requires `title.ro` / `title.en` non-empty and would 400. A pristine
      // entry won't autosave; once the author types a primary title every
      // subsequent autosave is in valid territory.
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

  // Two submit paths: "save draft" (default form submit, type="submit") and
  // "publish" (the EntryEditorShell action button). Create mode collapses
  // both into a single live save — drafts only matter once an article exists.
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
        <EntryOutlineProvider>
          <form onSubmit={mode === "edit" ? submitDraft : submitPublish}>
            <ArticleFormBody
              mode={mode}
              t={t}
              cancelHref={cancelHref}
              loading={loading}
              dirty={form.formState.isDirty}
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

interface ArticleFormBodyProps {
  mode: "create" | "edit";
  t: ReturnType<typeof useTranslations>;
  cancelHref: string;
  loading?: boolean;
  dirty: boolean;
  title: ReactNode;
  breadcrumb?: ReactNode;
  hasPendingDraft?: boolean;
  onPublish: () => void;
  autosaveState: import("@/components/entry-editor").AutosaveState | null;
}

/**
 * Body lives inside `FormProvider` so `useFormContext` works for the localized
 * primitives, and inside `EntryLocaleProvider` so the switcher/completeness
 * machinery can read the active locale.
 */
function ArticleFormBody({
  mode,
  t,
  cancelHref,
  loading,
  dirty,
  title,
  breadcrumb,
  hasPendingDraft,
  onPublish,
  autosaveState,
}: ArticleFormBodyProps) {
  const tc = useTranslations("Common");
  const { completeness, errorCounts } = useLocaleCompleteness<ArticleFormValues>(
    ["title", "excerpt", "content"],
  );

  // Edit mode renders the dual-action footer: primary submit saves a draft,
  // a separate Publish button promotes draft-or-form to live. Create mode
  // keeps the single Save behavior since drafts only apply after creation.
  const isEdit = mode === "edit";

  return (
    <EntryEditorShell
      title={
        <span className="flex items-center gap-2">
          {title}
          {hasPendingDraft ? (
            <span className="inline-flex items-center rounded-sm bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-warning">
              {tc("draftPending") ?? "Draft pending"}
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
            isEdit
              ? (tc("saveDraft") ?? "Save draft")
              : t("submitCreate")
          }
          publishAction={
            isEdit
              ? {
                  label: tc("publish") ?? "Publish",
                  onClick: onPublish,
                }
              : undefined
          }
        />
      }
      outline={<OutlineSidebar />}
      localizedFields={
        <>
          <LocalizedInput<ArticleFormValues>
            name="title"
            label={t("titleLabel")}
            required
          />
          <LocalizedTextarea<ArticleFormValues>
            name="excerpt"
            label={t("excerptLabel")}
            required
            rows={3}
          />
          <LocalizedTiptapEditor<ArticleFormValues>
            name="content"
            label={t("contentLabel")}
            required
          />
        </>
      }
      metadataFields={<ArticleMetadataFields mode={mode} t={t} />}
    />
  );
}

function ArticleMetadataFields({
  mode,
  t,
}: {
  mode: "create" | "edit";
  t: ReturnType<typeof useTranslations>;
}) {
  const tCategory = useTranslations("Articles.categoryLabel");
  const tStatus = useTranslations("Status");
  const form = useFormContext<ArticleFormValues>();
  const coverImage = form.watch("coverImage");

  return (
    <>
      <MetaField
        id="article-slug"
        label={t("slugLabel")}
        helper={t("slugHelper")}
        error={form.formState.errors.slug?.message}
      >
        <Input
          id="article-slug"
          {...form.register("slug")}
          placeholder={t("slugPlaceholder")}
          className="mono"
        />
      </MetaField>

      <MetaField id="article-category" label={t("categoryLabel")}>
        <Select
          value={form.watch("category")}
          onValueChange={(v) =>
            form.setValue("category", v as ArticleFormValues["category"], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="article-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ARTICLE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {tCategory(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </MetaField>

      <MetaField
        id="article-cover"
        label={t("coverImageLabel")}
        helper={t("coverImageHelper")}
        error={form.formState.errors.coverImage?.message}
      >
        <Input
          id="article-cover"
          {...form.register("coverImage")}
          placeholder={t("coverImagePlaceholder")}
        />
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt=""
            // Aspect-video (16:9) shows enough of a typical hero photo to
            // recognise it; the fixed height that used to live here squashed
            // images into a 96-px-tall strip.
            className="mt-1 aspect-video w-full rounded border border-border object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
            }}
          />
        ) : null}
      </MetaField>

      <MetaField id="article-tags" label={t("tagsLabel")}>
        <TagsInput
          id="article-tags"
          value={form.watch("tags") ?? []}
          onChange={(next) => form.setValue("tags", next, { shouldDirty: true })}
          placeholder={t("tagsPlaceholder")}
        />
      </MetaField>

      <MetaField
        id="article-author-name"
        label={t("authorNameLabel")}
        error={form.formState.errors.authorName?.message}
      >
        <Input
          id="article-author-name"
          {...form.register("authorName")}
          placeholder={t("authorNamePlaceholder")}
        />
      </MetaField>

      <MetaField
        id="article-author-avatar"
        label={t("authorAvatarLabel")}
        helper={t("authorAvatarHelper")}
      >
        <Input
          id="article-author-avatar"
          {...form.register("authorAvatar")}
          placeholder={t("authorAvatarPlaceholder")}
        />
      </MetaField>

      <MetaField
        id="article-read-time"
        label={t("readTimeLabel")}
        helper={t("readTimeHelper")}
      >
        <Input
          id="article-read-time"
          type="number"
          min={1}
          max={120}
          {...form.register("readTimeMinutes", {
            setValueAs: (v) =>
              v === "" || v === null || v === undefined ? undefined : Number(v),
          })}
          placeholder={t("readTimePlaceholder")}
          className="mono"
        />
      </MetaField>

      {mode === "edit" ? (
        <MetaField id="article-status" label={t("statusLabel")}>
          <Select
            value={form.watch("status") ?? "draft"}
            onValueChange={(v) =>
              form.setValue("status", v as ArticleFormValues["status"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger id="article-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARTICLE_STATUSES.map((s) => (
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

export { EMPTY_DEFAULTS as EMPTY_ARTICLE_DEFAULTS };
