"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  testimonialSchema,
  TestimonialFormValues,
} from "@/lib/validations/testimonial";
import { useApiFormErrors } from "@/lib/form-error";
import { toast } from "@/lib/toast";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";
import {
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
import { useTranslations } from "next-intl";

interface TestimonialFormProps {
  defaultValues?: Partial<TestimonialFormValues>;
  onSubmit: (data: TestimonialFormValues) => void;
  loading?: boolean;
  submissionError?: unknown;
  /** Where Cancel navigates (detail page on edit, list on create). */
  cancelHref: string;
}

export function TestimonialForm({
  defaultValues,
  onSubmit,
  loading,
  submissionError,
  cancelHref,
}: TestimonialFormProps) {
  const t = useTranslations("TestimonialForm");
  const tc = useTranslations("Common");

  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      clientName: "",
      location: "",
      propertyType: "",
      quote: { en: "", ro: "", fr: "", de: "" },
      rating: 5,
      ...defaultValues,
    },
  });

  useApiFormErrors(form, submissionError, (err) => {
    toast.error(err instanceof Error ? err.message : tc("saveFailed"));
  });

  useUnsavedChangesWarning(form.formState.isDirty);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full space-y-5"
    >
      <SectionCard title={t("title")}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("clientName")}</Label>
              <Input {...form.register("clientName")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("location")}</Label>
              <Input {...form.register("location")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("propertyType")}</Label>
              <Input {...form.register("propertyType")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("rating")}</Label>
              <Select
                value={String(form.watch("rating"))}
                onValueChange={(v) => form.setValue("rating", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {t("star", { count: r })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <BilingualTextarea
            label={t("quote")}
            valueEn={form.watch("quote.en")}
            valueRo={form.watch("quote.ro")}
            onChangeEn={(v) => form.setValue("quote.en", v)}
            onChangeRo={(v) => form.setValue("quote.ro", v)}
            valueFr={form.watch("quote.fr") ?? ""}
            valueDe={form.watch("quote.de") ?? ""}
            onChangeFr={(v) => form.setValue("quote.fr", v)}
            onChangeDe={(v) => form.setValue("quote.de", v)}
            required
            rows={4}
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
