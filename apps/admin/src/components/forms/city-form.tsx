"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import {
  EntryEditorShell,
  EntryLocaleProvider,
  LocalizedTextarea,
  MetaField,
  useLocaleCompleteness,
} from "@/components/entry-editor";
import { FormActions } from "@/components/shared/form-actions";
import { ImageUpload } from "@/components/shared/image-upload";
import { useApiFormErrors } from "@tge/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { citySchema, CityFormValues } from "@/lib/validations/city";
import type { ApiBrand, ApiCounty } from "@tge/types";
import { BrandBadges } from "@/components/shared/brand-badges";

interface CityFormProps {
  defaultValues?: Partial<CityFormValues>;
  imageUrl?: string | null;
  onSubmit: (data: CityFormValues, imageFile: File | null) => void;
  loading?: boolean;
  submissionError?: unknown;
  /** Where Cancel navigates (detail page on edit, list on create). */
  cancelHref: string;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

export function CityForm({
  defaultValues,
  imageUrl,
  onSubmit,
  loading,
  submissionError,
  cancelHref,
  title,
  breadcrumb,
}: CityFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const tc = useTranslations("Common");

  const form = useForm<CityFormValues>({
    resolver: zodResolver(citySchema),
    defaultValues: {
      name: "",
      slug: "",
      countySlug: "",
      description: { en: "", ro: "", fr: "", de: "" },
      propertyCount: 0,
      brands: [],
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
        <form onSubmit={form.handleSubmit((data) => onSubmit(data, imageFile))}>
          <CityFormBody
            cancelHref={cancelHref}
            loading={loading}
            dirty={form.formState.isDirty}
            imageUrl={imageUrl}
            onImageFileChange={setImageFile}
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
  imageUrl?: string | null;
  onImageFileChange: (file: File | null) => void;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

function CityFormBody({
  cancelHref,
  loading,
  dirty,
  imageUrl,
  onImageFileChange,
  title,
  breadcrumb,
}: BodyProps) {
  const t = useTranslations("CityForm");
  const { completeness, errorCounts } = useLocaleCompleteness<CityFormValues>(
    ["description"],
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
        <LocalizedTextarea<CityFormValues>
          name="description"
          label={t("description")}
          required
          rows={8}
        />
      }
      extraSection={
        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
            {t("cityImage")}
          </p>
          <ImageUpload value={imageUrl} onChange={onImageFileChange} />
        </div>
      }
      metadataFields={<CityMetadataFields t={t} />}
    />
  );
}

function CityMetadataFields({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const tc = useTranslations("Common");
  const form = useFormContext<CityFormValues>();

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
    <>
      <MetaField id="city-name" label={t("name")}>
        <Input id="city-name" {...form.register("name")} />
      </MetaField>

      <MetaField id="city-slug" label={t("slug")}>
        <div className="flex gap-2">
          <Input
            id="city-slug"
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

      <MetaField
        id="city-county"
        label={t("county")}
        error={form.formState.errors.countySlug?.message}
      >
        <Select
          value={form.watch("countySlug") || undefined}
          onValueChange={(v) =>
            form.setValue("countySlug", v, { shouldValidate: true })
          }
          disabled={countiesLoading}
        >
          <SelectTrigger
            id="city-county"
            aria-invalid={!!form.formState.errors.countySlug}
          >
            <SelectValue
              placeholder={countiesLoading ? tc("loading") : t("selectCounty")}
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
      </MetaField>

      <MetaField id="city-property-count" label={t("propertyCount")}>
        <Input
          id="city-property-count"
          type="number"
          {...form.register("propertyCount", { valueAsNumber: true })}
          className="mono"
        />
      </MetaField>

      <MetaField
        id="city-brands"
        label={t("brands")}
        helper={t("brandsHelper")}
      >
        <BrandBadges
          size="md"
          brands={form.watch("brands") ?? []}
          onToggle={({ brand, next }) => {
            const current = new Set<ApiBrand>(form.getValues("brands") ?? []);
            if (next) current.add(brand);
            else current.delete(brand);
            form.setValue("brands", Array.from(current), {
              shouldDirty: true,
            });
          }}
        />
      </MetaField>
    </>
  );
}
