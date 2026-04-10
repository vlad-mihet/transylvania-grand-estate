"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { agentSchema, AgentFormValues } from "@/lib/validations/agent";
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

interface AgentFormProps {
  defaultValues?: Partial<AgentFormValues>;
  photoUrl?: string | null;
  onSubmit: (data: AgentFormValues, photoFile: File | null) => void;
  loading?: boolean;
}

export function AgentForm({
  defaultValues,
  photoUrl,
  onSubmit,
  loading,
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
      className="max-w-5xl space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {tc("saving")}</> : t("saveAgent")}
        </Button>
      </div>
    </form>
  );
}
