"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { agentSchema, AgentFormValues } from "@/lib/validations/agent";
import { useApiFormErrors } from "@tge/hooks";
import { toast } from "@/lib/toast";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";
import { ImageUpload } from "@/components/shared/image-upload";
import { Button, Input, Label, Switch } from "@tge/ui";
import { SectionCard } from "@/components/shared/section-card";
import { FormActions } from "@/components/shared/form-actions";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface AgentFormProps {
  defaultValues?: Partial<AgentFormValues>;
  photoUrl?: string | null;
  onSubmit: (data: AgentFormValues, photoFile: File | null) => void;
  loading?: boolean;
  submissionError?: unknown;
  /** Where Cancel navigates (detail page on edit, list on create). */
  cancelHref: string;
}

export function AgentForm({
  defaultValues,
  photoUrl,
  onSubmit,
  loading,
  submissionError,
  cancelHref,
}: AgentFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const t = useTranslations("AgentForm");
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
    <form
      onSubmit={form.handleSubmit((data) => onSubmit(data, photoFile))}
      className="w-full space-y-5"
    >
      <SectionCard title={t("title")}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("firstName")}</Label>
              <Input {...form.register("firstName")} />
            </div>
            <div className="space-y-2">
              <Label>{t("lastName")}</Label>
              <Input {...form.register("lastName")} />
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label>{t("slug")}</Label>
              <Input {...form.register("slug")} />
            </div>
            <Button type="button" variant="outline" onClick={generateSlug}>
              {tc("generate")}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("email")}</Label>
              <Input type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label>{t("phone")}</Label>
              <Input {...form.register("phone")} />
            </div>
          </div>
          <BilingualTextarea
            label={t("bio")}
            valueEn={form.watch("bio.en")}
            valueRo={form.watch("bio.ro")}
            onChangeEn={(v) => form.setValue("bio.en", v)}
            onChangeRo={(v) => form.setValue("bio.ro", v)}
            valueFr={form.watch("bio.fr") ?? ""}
            valueDe={form.watch("bio.de") ?? ""}
            onChangeFr={(v) => form.setValue("bio.fr", v)}
            onChangeDe={(v) => form.setValue("bio.de", v)}
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.watch("active")}
              onCheckedChange={(v) => form.setValue("active", v)}
            />
            {t("active")}
          </label>
          <ImageUpload
            label={t("photo")}
            value={photoUrl}
            onChange={(file) => setPhotoFile(file)}
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
