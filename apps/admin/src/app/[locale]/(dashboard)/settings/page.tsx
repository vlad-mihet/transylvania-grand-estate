"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button, ErrorState, Input, Label, Skeleton } from "@tge/ui";
import { apiClient } from "@/lib/api-client";
import {
  siteConfigSchema,
  SiteConfigFormValues,
} from "@/lib/validations/site-config";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import {
  EntryLocaleProvider,
  EntryLocaleSwitcher,
  LocalizedInput,
  LocalizedTextarea,
  useLocaleCompleteness,
} from "@/components/entry-editor";
import { useRouter } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");
  const router = useRouter();
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("site-config.read")) router.replace("/403");
  }, [can, router]);

  const {
    data: config,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["site-config"],
    queryFn: () => apiClient<Partial<SiteConfigFormValues>>("/site-config"),
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

  const saveMutation = useMutation({
    mutationFn: (data: SiteConfigFormValues) =>
      apiClient("/site-config", { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
      toast.success(t("saved"));
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading)
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-48 rounded-md" />
        <Skeleton className="h-32 rounded-md" />
        <Skeleton className="h-32 rounded-md" />
      </div>
    );

  if (isError)
    return (
      <div className="space-y-5">
        <PageHeader title={t("title")} description={t("description")} />
        <ErrorState onRetry={() => refetch()} />
      </div>
    );

  if (!can("site-config.read")) return null;

  return (
    <FormProvider {...form}>
      <EntryLocaleProvider>
        <SettingsBody
          t={t}
          tc={tc}
          saving={saveMutation.isPending}
          onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}
        />
      </EntryLocaleProvider>
    </FormProvider>
  );
}

interface BodyProps {
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  saving: boolean;
  onSubmit: () => void;
}

function SettingsBody({ t, tc, saving, onSubmit }: BodyProps) {
  const { completeness, errorCounts } =
    useLocaleCompleteness<SiteConfigFormValues>(["tagline", "description"]);
  const form = useFormContext<SiteConfigFormValues>();

  const socialFields = useFieldArray({
    control: form.control,
    name: "socialLinks",
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title={t("title")} description={t("description")} />
        <EntryLocaleSwitcher
          completeness={completeness}
          errorCounts={errorCounts}
        />
      </div>

      <SectionCard title={t("companyInfo")}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("companyName")}</Label>
              <Input {...form.register("name")} />
            </div>
          </div>
          <LocalizedInput<SiteConfigFormValues>
            name="tagline"
            label={t("tagline")}
            required
          />
          <LocalizedTextarea<SiteConfigFormValues>
            name="description"
            label={t("settingsDescription")}
            required
            rows={3}
          />
        </div>
      </SectionCard>

      <SectionCard title={t("contact")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("email")}</Label>
            <Input
              {...form.register("contact.email")}
              type="email"
              className="mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("phone")}</Label>
            <Input {...form.register("contact.phone")} className="mono" />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("socialLinks")}
        headerActions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => socialFields.append({ platform: "", url: "" })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {tc("add")}
          </Button>
        }
      >
        <div className="space-y-3">
          {socialFields.fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="space-y-1.5 sm:flex-1">
                <Label>{t("platform")}</Label>
                <Input {...form.register(`socialLinks.${index}.platform`)} />
              </div>
              <div className="space-y-1.5 sm:flex-[2]">
                <Label>{t("url")}</Label>
                <Input
                  {...form.register(`socialLinks.${index}.url`)}
                  className="mono"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end text-destructive/70 hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                onClick={() => socialFields.remove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {socialFields.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noSocialLinks")}</p>
          )}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {tc("saving")}
            </>
          ) : (
            t("saveSettings")
          )}
        </Button>
      </div>
    </form>
  );
}

