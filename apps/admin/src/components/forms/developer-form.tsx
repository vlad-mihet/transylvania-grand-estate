"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { developerSchema, DeveloperFormValues } from "@/lib/validations/developer";
import { BilingualInput } from "@/components/shared/bilingual-input";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  Button,
  Input,
  Label,
  Switch,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@tge/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface DeveloperFormProps {
  defaultValues?: Partial<DeveloperFormValues>;
  logoUrl?: string | null;
  onSubmit: (data: DeveloperFormValues, logoFile: File | null) => void;
  loading?: boolean;
}

export function DeveloperForm({
  defaultValues,
  logoUrl,
  onSubmit,
  loading,
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
      className="max-w-5xl space-y-6"
    >
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
            <div className="space-y-2">
              <Label>{t("city")}</Label>
              <Input {...form.register("city")} />
            </div>
            <div className="space-y-2">
              <Label>{t("citySlug")}</Label>
              <Input {...form.register("citySlug")} />
            </div>
            <div className="space-y-2">
              <Label>{t("website")}</Label>
              <Input {...form.register("website")} placeholder="https://" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("projectCount")}</Label>
              <Input type="number" {...form.register("projectCount")} />
            </div>
            <label className="flex items-center gap-2 pt-7 text-sm">
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
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {tc("saving")}</> : t("saveDeveloper")}
        </Button>
      </div>
    </form>
  );
}
