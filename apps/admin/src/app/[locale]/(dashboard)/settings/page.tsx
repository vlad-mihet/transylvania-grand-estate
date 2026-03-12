"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient } from "@/lib/api-client";
import { siteConfigSchema, SiteConfigFormValues } from "@/lib/validations/site-config";
import { PageHeader } from "@/components/shared/page-header";
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
} from "@tge/ui";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { QueryError } from "@/components/shared/query-error";
import { BilingualInput } from "@/components/shared/bilingual-input";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");

  const { data: config, isLoading, isError, refetch } = useQuery({
    queryKey: ["site-config"],
    queryFn: () => apiClient<any>("/site-config"),
  });

  const form = useForm<SiteConfigFormValues>({
    resolver: zodResolver(siteConfigSchema),
    defaultValues: {
      name: "",
      tagline: { en: "", ro: "", fr: "", de: "" },
      description: { en: "", ro: "", fr: "", de: "" },
      contact: { email: "", phone: "" },
      socialLinks: [],
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        name: config.name ?? "",
        tagline: config.tagline ?? { en: "", ro: "", fr: "", de: "" },
        description: config.description ?? { en: "", ro: "", fr: "", de: "" },
        contact: config.contact ?? { email: "", phone: "" },
        socialLinks: config.socialLinks ?? [],
      });
    }
  }, [config, form]);

  const socialFields = useFieldArray({ control: form.control, name: "socialLinks" });

  const saveMutation = useMutation({
    mutationFn: (data: SiteConfigFormValues) =>
      apiClient("/site-config", { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
      toast.success(t("saved"));
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );

  if (isError) return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <QueryError onRetry={refetch} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="max-w-5xl space-y-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">{t("companyInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("companyName")}</Label>
                <Input {...form.register("name")} />
              </div>
            </div>
            <BilingualInput
              label={t("tagline")}
              valueEn={form.watch("tagline.en")}
              valueRo={form.watch("tagline.ro")}
              onChangeEn={(v) => form.setValue("tagline.en", v)}
              onChangeRo={(v) => form.setValue("tagline.ro", v)}
              valueFr={form.watch("tagline.fr") ?? ""}
              valueDe={form.watch("tagline.de") ?? ""}
              onChangeFr={(v) => form.setValue("tagline.fr", v)}
              onChangeDe={(v) => form.setValue("tagline.de", v)}
              required
            />
            <BilingualTextarea
              label={t("settingsDescription")}
              valueEn={form.watch("description.en")}
              valueRo={form.watch("description.ro")}
              onChangeEn={(v) => form.setValue("description.en", v)}
              onChangeRo={(v) => form.setValue("description.ro", v)}
              valueFr={form.watch("description.fr") ?? ""}
              valueDe={form.watch("description.de") ?? ""}
              onChangeFr={(v) => form.setValue("description.fr", v)}
              onChangeDe={(v) => form.setValue("description.de", v)}
              required
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">{t("contact")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("email")}</Label>
                <Input {...form.register("contact.email")} type="email" />
              </div>
              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input {...form.register("contact.phone")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-lg">{t("socialLinks")}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => socialFields.append({ platform: "", url: "" })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> {tc("add")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {socialFields.fields.map((field, index) => (
              <div key={field.id} className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label>{t("platform")}</Label>
                  <Input {...form.register(`socialLinks.${index}.platform`)} />
                </div>
                <div className="flex-[2] space-y-2">
                  <Label>{t("url")}</Label>
                  <Input {...form.register(`socialLinks.${index}.url`)} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => socialFields.remove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {socialFields.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noSocialLinks")}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> {tc("saving")}</> : t("saveSettings")}
          </Button>
        </div>
      </form>
    </div>
  );
}
