"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { citySchema, CityFormValues } from "@/lib/validations/city";
import { useApiFormErrors } from "@/lib/form-error";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import type { ApiCounty } from "@tge/types";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface CityFormProps {
  defaultValues?: Partial<CityFormValues>;
  imageUrl?: string | null;
  onSubmit: (data: CityFormValues, imageFile: File | null) => void;
  loading?: boolean;
  submissionError?: unknown;
}

export function CityForm({ defaultValues, imageUrl, onSubmit, loading, submissionError }: CityFormProps) {
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
    toast.error(err instanceof Error ? err.message : "Failed to save");
  });

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
    <form onSubmit={form.handleSubmit((data) => onSubmit(data, imageFile))} className="max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("name")}</Label>
              <Input {...form.register("name")} />
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
          </div>
          <div className="space-y-2">
            <Label>{t("county")}</Label>
            <Select
              value={form.watch("countySlug") || undefined}
              onValueChange={(v) => form.setValue("countySlug", v, { shouldValidate: true })}
              disabled={countiesLoading}
            >
              <SelectTrigger aria-invalid={!!form.formState.errors.countySlug}>
                <SelectValue placeholder={countiesLoading ? tc("loading") : t("selectCounty")} />
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
              <p className="text-destructive text-sm">{form.formState.errors.countySlug.message}</p>
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
          <div className="space-y-2">
            <Label>{t("propertyCount")}</Label>
            <Input type="number" {...form.register("propertyCount")} className="max-w-[200px] w-full" />
          </div>
          <ImageUpload label={t("cityImage")} value={imageUrl} onChange={setImageFile} />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>{tc("cancel")}</Button>
        <Button type="submit" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {tc("saving")}</> : t("saveCity")}</Button>
      </div>
    </form>
  );
}
