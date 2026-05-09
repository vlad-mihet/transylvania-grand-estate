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
  LocalizedInput,
  LocalizedTextarea,
  MetaField,
  useLocaleCompleteness,
} from "@/components/entry-editor";
import { FormActions } from "@/components/shared/form-actions";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  developerSchema,
  DeveloperFormValues,
} from "@/lib/validations/developer";
import { useApiFormErrors } from "@tge/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toast } from "@/lib/toast";

interface DeveloperFormProps {
  defaultValues?: Partial<DeveloperFormValues>;
  logoUrl?: string | null;
  onSubmit: (data: DeveloperFormValues, logoFile: File | null) => void;
  loading?: boolean;
  submissionError?: unknown;
  cancelHref: string;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

export function DeveloperForm({
  defaultValues,
  logoUrl,
  onSubmit,
  loading,
  submissionError,
  cancelHref,
  title,
  breadcrumb,
}: DeveloperFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const tc = useTranslations("Common");

  const form = useForm<DeveloperFormValues>({
    resolver: zodResolver(developerSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: { en: "", ro: "", fr: "", de: "" },
      shortDescription: { en: "", ro: "", fr: "", de: "" },
      city: "",
      citySlug: "",
      website: "",
      projectCount: 0,
      featured: false,
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
        <form onSubmit={form.handleSubmit((data) => onSubmit(data, logoFile))}>
          <DeveloperFormBody
            cancelHref={cancelHref}
            loading={loading}
            dirty={form.formState.isDirty}
            logoUrl={logoUrl}
            onLogoFileChange={setLogoFile}
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
  logoUrl?: string | null;
  onLogoFileChange: (file: File | null) => void;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

function DeveloperFormBody({
  cancelHref,
  loading,
  dirty,
  logoUrl,
  onLogoFileChange,
  title,
  breadcrumb,
}: BodyProps) {
  const t = useTranslations("DeveloperForm");
  const { completeness, errorCounts } = useLocaleCompleteness<DeveloperFormValues>(
    ["description", "shortDescription"],
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
        <>
          <LocalizedInput<DeveloperFormValues>
            name="shortDescription"
            label={t("shortDescription")}
            required
          />
          <LocalizedTextarea<DeveloperFormValues>
            name="description"
            label={t("description")}
            required
            rows={8}
          />
        </>
      }
      extraSection={
        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
            {t("logo")}
          </p>
          <ImageUpload value={logoUrl} onChange={onLogoFileChange} />
        </div>
      }
      metadataFields={<DeveloperMetadataFields t={t} />}
    />
  );
}

function DeveloperMetadataFields({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const tc = useTranslations("Common");
  const form = useFormContext<DeveloperFormValues>();

  const generateSlug = () => {
    const name = form.getValues("name");
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    form.setValue("slug", slug);
  };

  return (
    <>
      <MetaField id="developer-name" label={t("name")}>
        <Input id="developer-name" {...form.register("name")} />
      </MetaField>
      <MetaField id="developer-slug" label={t("slug")}>
        <div className="flex gap-2">
          <Input
            id="developer-slug"
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
      <MetaField id="developer-city" label={t("city")}>
        <Input id="developer-city" {...form.register("city")} />
      </MetaField>
      <MetaField id="developer-city-slug" label={t("citySlug")}>
        <Input
          id="developer-city-slug"
          {...form.register("citySlug")}
          className="mono"
        />
      </MetaField>
      <MetaField id="developer-website" label={t("website")}>
        <Input
          id="developer-website"
          {...form.register("website")}
          placeholder="https://"
        />
      </MetaField>
      <MetaField id="developer-project-count" label={t("projectCount")}>
        <Input
          id="developer-project-count"
          type="number"
          {...form.register("projectCount", { valueAsNumber: true })}
          className="mono"
        />
      </MetaField>
      <label className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium tracking-[0.04em]">
          {t("featuredDeveloper")}
        </span>
        <Switch
          checked={form.watch("featured")}
          onCheckedChange={(v) => form.setValue("featured", v)}
        />
      </label>
    </>
  );
}
