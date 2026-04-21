"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { citySchema, CityFormValues } from "@/lib/validations/city";
import { useApiFormErrors } from "@/lib/form-error";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";
import { ImageUpload } from "@/components/shared/image-upload";
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
import { SectionCard } from "@/components/shared/section-card";
import { FormActions } from "@/components/shared/form-actions";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import type { ApiCounty } from "@tge/types";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface CityFormProps {
  defaultValues?: Partial<CityFormValues>;
  imageUrl?: string | null;
  onSubmit: (data: CityFormValues, imageFile: File | null) => void;
  loading?: boolean;
  submissionError?: unknown;
  /** Where Cancel navigates (detail page on edit, list on create). */
  cancelHref: string;
}

export function CityForm({ defaultValues, imageUrl, onSubmit, loading, submissionError, cancelHref }: CityFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const t = useTranslations("CityForm");
  const tc = useTranslations("Common");

  const form = useForm<CityFormValues>({
    resolver: zodResolver(citySchema),
    defaultValues: {
      name: "",
      slug: "",
      countySlug: "",
      description: { en: "", ro: "", fr: "", de: "" },
      propertyCount: 0,
      ...defaultValues,
    },
  });

  useApiFormErrors(form, submissionError, (err) => {
    toast.error(err instanceof Error ? err.message : tc("saveFailed"));
  });

  useUnsavedChangesWarning(form.formState.isDirty);

  // Counties feed the select below. React Query caches the result per
  // session so opening /cities/new repeatedly doesn't refetch, and all
  // 42 Romanian județe comfortably fit in one page — no pagination
  // needed.
  const { data: counties, isLoading: countiesLoading } = useQuery({
    queryKey: ["counties-select"],
    queryFn: () => apiClient<ApiCounty[]>("/counties"),
  });

  const generateSlug = () => {
    const name = form.getValues("name");
    form.setValue(
      "slug",
      name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-"),
    );
  };

  return (
    <form
      onSubmit={form.handleSubmit((data) => onSubmit(data, imageFile))}
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSlug}
              >
                {tc("generate")}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("county")}</Label>
            <Select
              value={form.watch("countySlug") || undefined}
              onValueChange={(v) =>
                form.setValue("countySlug", v, { shouldValidate: true })
              }
              disabled={countiesLoading}
            >
              <SelectTrigger
                aria-invalid={!!form.formState.errors.countySlug}
              >
                <SelectValue
                  placeholder={
                    countiesLoading ? tc("loading") : t("selectCounty")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(counties ?? []).map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.countySlug && (
              <p className="text-[11px] text-[var(--color-danger)]">
                {form.formState.errors.countySlug.message}
              </p>
            )}
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
          <div className="space-y-1.5">
            <Label>{t("propertyCount")}</Label>
            <Input
              type="number"
              {...form.register("propertyCount")}
              className="mono max-w-[200px]"
            />
          </div>
          <ImageUpload
            label={t("cityImage")}
            value={imageUrl}
            onChange={setImageFile}
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
