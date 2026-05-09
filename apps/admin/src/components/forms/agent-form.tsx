"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button, Input, Switch } from "@tge/ui";
import {
  EntryEditorShell,
  EntryLocaleProvider,
  LocalizedTextarea,
  MetaField,
  useLocaleCompleteness,
} from "@/components/entry-editor";
import { FormActions } from "@/components/shared/form-actions";
import { ImageUpload } from "@/components/shared/image-upload";
import { agentSchema, AgentFormValues } from "@/lib/validations/agent";
import { useApiFormErrors } from "@tge/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toast } from "@/lib/toast";

interface AgentFormProps {
  defaultValues?: Partial<AgentFormValues>;
  photoUrl?: string | null;
  onSubmit: (data: AgentFormValues, photoFile: File | null) => void;
  loading?: boolean;
  submissionError?: unknown;
  cancelHref: string;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

export function AgentForm({
  defaultValues,
  photoUrl,
  onSubmit,
  loading,
  submissionError,
  cancelHref,
  title,
  breadcrumb,
}: AgentFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const tc = useTranslations("Common");

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      slug: "",
      email: "",
      phone: "",
      bio: { en: "", ro: "", fr: "", de: "" },
      active: true,
      ...defaultValues,
    },
  });

  useApiFormErrors(form, submissionError, (err) => {
    toast.error(err instanceof Error ? err.message : tc("saveFailed"));
  });
  useUnsavedChangesWarning(form.formState.isDirty);

  return (
    <FormProvider {...form}>
      <EntryLocaleProvider>
        <form onSubmit={form.handleSubmit((data) => onSubmit(data, photoFile))}>
          <AgentFormBody
            cancelHref={cancelHref}
            loading={loading}
            dirty={form.formState.isDirty}
            photoUrl={photoUrl}
            onPhotoFileChange={setPhotoFile}
            title={title}
            breadcrumb={breadcrumb}
          />
        </form>
      </EntryLocaleProvider>
    </FormProvider>
  );
}

interface BodyProps {
  cancelHref: string;
  loading?: boolean;
  dirty: boolean;
  photoUrl?: string | null;
  onPhotoFileChange: (file: File | null) => void;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

function AgentFormBody({
  cancelHref,
  loading,
  dirty,
  photoUrl,
  onPhotoFileChange,
  title,
  breadcrumb,
}: BodyProps) {
  const t = useTranslations("AgentForm");
  const { completeness, errorCounts } = useLocaleCompleteness<AgentFormValues>(
    ["bio"],
  );

  return (
    <EntryEditorShell
      title={title}
      breadcrumb={breadcrumb}
      unsavedDirty={dirty}
      switcherCompleteness={completeness}
      switcherErrorCounts={errorCounts}
      actions={
        <FormActions cancelHref={cancelHref} loading={loading} dirty={dirty} />
      }
      localizedFields={
        <LocalizedTextarea<AgentFormValues>
          name="bio"
          label={t("bio")}
          required
          rows={8}
        />
      }
      extraSection={
        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
            {t("photo")}
          </p>
          <ImageUpload value={photoUrl} onChange={onPhotoFileChange} />
        </div>
      }
      metadataFields={<AgentMetadataFields t={t} />}
    />
  );
}

function AgentMetadataFields({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const tc = useTranslations("Common");
  const form = useFormContext<AgentFormValues>();

  const generateSlug = () => {
    const firstName = form.getValues("firstName");
    const lastName = form.getValues("lastName");
    const slug = `${firstName}-${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    form.setValue("slug", slug);
  };

  return (
    <>
      <MetaField id="agent-first-name" label={t("firstName")}>
        <Input id="agent-first-name" {...form.register("firstName")} />
      </MetaField>
      <MetaField id="agent-last-name" label={t("lastName")}>
        <Input id="agent-last-name" {...form.register("lastName")} />
      </MetaField>
      <MetaField id="agent-slug" label={t("slug")}>
        <div className="flex gap-2">
          <Input
            id="agent-slug"
            {...form.register("slug")}
            className="mono flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateSlug}
          >
            {tc("generate")}
          </Button>
        </div>
      </MetaField>
      <MetaField id="agent-email" label={t("email")}>
        <Input id="agent-email" type="email" {...form.register("email")} />
      </MetaField>
      <MetaField id="agent-phone" label={t("phone")}>
        <Input id="agent-phone" {...form.register("phone")} className="mono" />
      </MetaField>
      <label className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium tracking-[0.04em]">{t("active")}</span>
        <Switch
          checked={form.watch("active")}
          onCheckedChange={(v) => form.setValue("active", v)}
        />
      </label>
    </>
  );
}
