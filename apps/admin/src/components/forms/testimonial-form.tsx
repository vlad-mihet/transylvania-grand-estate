"use client";

import type { ReactNode } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
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
import {
  testimonialSchema,
  TestimonialFormValues,
} from "@/lib/validations/testimonial";
import { useApiFormErrors } from "@tge/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toast } from "@/lib/toast";

interface TestimonialFormProps {
  defaultValues?: Partial<TestimonialFormValues>;
  onSubmit: (data: TestimonialFormValues) => void;
  loading?: boolean;
  submissionError?: unknown;
  cancelHref: string;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

export function TestimonialForm({
  defaultValues,
  onSubmit,
  loading,
  submissionError,
  cancelHref,
  title,
  breadcrumb,
}: TestimonialFormProps) {
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
    <FormProvider {...form}>
      <EntryLocaleProvider>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <TestimonialFormBody
            cancelHref={cancelHref}
            loading={loading}
            dirty={form.formState.isDirty}
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
  title: ReactNode;
  breadcrumb?: ReactNode;
}

function TestimonialFormBody({
  cancelHref,
  loading,
  dirty,
  title,
  breadcrumb,
}: BodyProps) {
  const t = useTranslations("TestimonialForm");
  const { completeness, errorCounts } =
    useLocaleCompleteness<TestimonialFormValues>(["quote"]);

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
        <LocalizedTextarea<TestimonialFormValues>
          name="quote"
          label={t("quote")}
          required
          rows={6}
        />
      }
      metadataFields={<TestimonialMetadataFields t={t} />}
    />
  );
}

function TestimonialMetadataFields({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const form = useFormContext<TestimonialFormValues>();

  return (
    <>
      <MetaField id="testimonial-client-name" label={t("clientName")}>
        <Input
          id="testimonial-client-name"
          {...form.register("clientName")}
        />
      </MetaField>
      <MetaField id="testimonial-location" label={t("location")}>
        <Input id="testimonial-location" {...form.register("location")} />
      </MetaField>
      <MetaField id="testimonial-property-type" label={t("propertyType")}>
        <Input
          id="testimonial-property-type"
          {...form.register("propertyType")}
        />
      </MetaField>
      <MetaField id="testimonial-rating" label={t("rating")}>
        <Select
          value={String(form.watch("rating"))}
          onValueChange={(v) => form.setValue("rating", Number(v))}
        >
          <SelectTrigger id="testimonial-rating">
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
      </MetaField>
    </>
  );
}
