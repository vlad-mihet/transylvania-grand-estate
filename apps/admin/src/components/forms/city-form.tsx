"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { citySchema, CityFormValues } from "@/lib/validations/city";
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
} from "@tge/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface CityFormProps {
  defaultValues?: Partial<CityFormValues>;
  imageUrl?: string | null;
  onSubmit: (data: CityFormValues, imageFile: File | null) => void;
  loading?: boolean;
}

export function CityForm({ defaultValues, imageUrl, onSubmit, loading }: CityFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const t = useTranslations("CityForm");
  const tc = useTranslations("Common");

  const form = useForm<CityFormValues>({
    resolver: zodResolver(citySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: { en: "", ro: "" },
      propertyCount: 0,
      ...defaultValues,
    },
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
          <BilingualTextarea
            label={t("description")}
            valueEn={form.watch("description.en")}
            valueRo={form.watch("description.ro")}
            onChangeEn={(v) => form.setValue("description.en", v)}
            onChangeRo={(v) => form.setValue("description.ro", v)}
            required
          />
          <div className="space-y-2">
            <Label>{t("propertyCount")}</Label>
            <Input type="number" {...form.register("propertyCount")} className="max-w-[200px]" />
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
