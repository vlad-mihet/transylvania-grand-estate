"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { developerSchema, DeveloperFormValues } from "@/lib/validations/developer";
import { useApiFormErrors } from "@tge/hooks";
import { toast } from "@/lib/toast";
import { BilingualInput } from "@/components/shared/bilingual-input";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";
import { ImageUpload } from "@/components/shared/image-upload";
import { Button, Input, Label, Switch } from "@tge/ui";
import { SectionCard } from "@/components/shared/section-card";
import { FormActions } from "@/components/shared/form-actions";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface DeveloperFormProps {
  defaultValues?: Partial<DeveloperFormValues>;
  logoUrl?: string | null;
  onSubmit: (data: DeveloperFormValues, logoFile: File | null) => void;
  loading?: boolean;
  submissionError?: unknown;
  /** Where Cancel navigates (detail page on edit, list on create). */
  cancelHref: string;
}

export function DeveloperForm({
  defaultValues,
  logoUrl,
  onSubmit,
  loading,
  submissionError,
  cancelHref,
}: DeveloperFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const t = useTranslations("DeveloperForm");
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

  const generateSlug = () => {
    const name = form.getValues("name");
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    form.setValue("slug", slug);
  };

  return (
    <form
      onSubmit={form.handleSubmit((data) => onSubmit(data, logoFile))}
      className="w-full space-y-5"
    >
      <SectionCard title={t("title")}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("name")}</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>{t("slug")}</Label>
                <Input {...form.register("slug")} className="mono" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={generateSlug}>
                {tc("generate")}
              </Button>
            </div>
          </div>
          <BilingualTextarea
            label={t("description")}
            valueEn={form.watch("description.en")}
            valueRo={form.watch("description.ro")}
            onChangeEn={(v) => form.setValue("description.en", v)}
            onChangeRo={(v) => form.setValue("description.ro", v)}
            valueFr={form.watch("description.fr") ?? ""}
            valueDe={form.watch("description.de") ?? ""}
            onChangeFr={(v) => form.setValue("description.fr", v)}
            onChangeDe={(v) => form.setValue("description.de", v)}
            required
          />
          <BilingualInput
            label={t("shortDescription")}
            valueEn={form.watch("shortDescription.en")}
            valueRo={form.watch("shortDescription.ro")}
            onChangeEn={(v) => form.setValue("shortDescription.en", v)}
            onChangeRo={(v) => form.setValue("shortDescription.ro", v)}
            valueFr={form.watch("shortDescription.fr") ?? ""}
            valueDe={form.watch("shortDescription.de") ?? ""}
            onChangeFr={(v) => form.setValue("shortDescription.fr", v)}
            onChangeDe={(v) => form.setValue("shortDescription.de", v)}
            required
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("city")}</Label>
              <Input {...form.register("city")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("citySlug")}</Label>
              <Input {...form.register("citySlug")} className="mono" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("website")}</Label>
              <Input {...form.register("website")} placeholder="https://" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="space-y-1.5">
              <Label>{t("projectCount")}</Label>
              <Input type="number" {...form.register("projectCount")} className="mono" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.watch("featured")}
                onCheckedChange={(v) => form.setValue("featured", v)}
              />
              {t("featuredDeveloper")}
            </label>
          </div>
          <ImageUpload
            label={t("logo")}
            value={logoUrl}
            onChange={(file) => setLogoFile(file)}
          />
        </div>
      </SectionCard>

      <FormActions
        cancelHref={cancelHref}
        loading={loading}
        dirty={form.formState.isDirty}
      />
    </form>
  );
}
