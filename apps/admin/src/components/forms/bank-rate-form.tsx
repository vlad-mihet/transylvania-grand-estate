"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bankRateSchema, BankRateFormValues } from "@/lib/validations/bank-rate";
import { useApiFormErrors } from "@tge/hooks";
import { toast } from "@/lib/toast";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@tge/ui";
import { SectionCard } from "@/components/shared/section-card";
import { FormActions } from "@/components/shared/form-actions";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { useTranslations } from "next-intl";

interface BankRateFormProps {
  defaultValues?: Partial<BankRateFormValues>;
  onSubmit: (data: BankRateFormValues) => void;
  loading?: boolean;
  submissionError?: unknown;
  /** Where Cancel navigates (detail page on edit, list on create). */
  cancelHref: string;
}

export function BankRateForm({
  defaultValues,
  onSubmit,
  loading,
  submissionError,
  cancelHref,
}: BankRateFormProps) {
  const t = useTranslations("BankRateForm");
  const tc = useTranslations("Common");

  // <input type="number"> emits string values; the form schema declares
  // `z.number()` (no coerce — by design after the v4 upgrade so useForm<T>
  // infers `number`, not `unknown`). Without coercion here, submit silently
  // fails Zod and `shouldFocusError` bounces focus on the first invalid
  // field. `requiredNumber` for non-null fields, `optionalNullableNumber`
  // for the .nullable().optional() ones.
  const requiredNumber = { valueAsNumber: true } as const;
  const optionalNullableNumber = {
    setValueAs: (v: unknown) =>
      v === "" || v === null || v === undefined ? null : Number(v),
  } as const;

  const form = useForm<BankRateFormValues>({
    resolver: zodResolver(bankRateSchema),
    defaultValues: {
      bankName: "",
      rate: 6.0,
      rateType: "fixed",
      maxLtv: 0.85,
      maxTermYears: 30,
      processingFee: 0.5,
      insuranceRate: 0.05,
      notes: "",
      active: true,
      sortOrder: 0,
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
              <Label>{t("bankName")}</Label>
              <Input {...form.register("bankName")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("rate")}</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("rate", requiredNumber)}
                className="mono"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("rateType")}</Label>
              <Select
                value={form.watch("rateType")}
                onValueChange={(v) =>
                  form.setValue(
                    "rateType",
                    v as BankRateFormValues["rateType"],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t("types.fixed")}</SelectItem>
                  <SelectItem value="variable">
                    {t("types.variable")}
                  </SelectItem>
                  <SelectItem value="govt_program">
                    {t("types.govtProgram")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("sortOrder")}</Label>
              <Input
                type="number"
                step="1"
                {...form.register("sortOrder", requiredNumber)}
                className="mono"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("loanDetails")}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("maxLtv")}</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("maxLtv", optionalNullableNumber)}
                className="mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("maxLtvHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("maxTermYears")}</Label>
              <Input
                type="number"
                step="1"
                {...form.register("maxTermYears", optionalNullableNumber)}
                className="mono"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("processingFee")}</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("processingFee", optionalNullableNumber)}
                className="mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("processingFeeHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("insuranceRate")}</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("insuranceRate", optionalNullableNumber)}
                className="mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("insuranceRateHint")}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Input
              {...form.register("notes")}
              placeholder={t("notesPlaceholder")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.watch("active")}
              onCheckedChange={(v) => form.setValue("active", v)}
            />
            {t("active")}
          </label>
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
