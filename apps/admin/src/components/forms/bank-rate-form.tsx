"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bankRateSchema, BankRateFormValues } from "@/lib/validations/bank-rate";
import { useApiFormErrors } from "@/lib/form-error";
import { toast } from "sonner";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@tge/ui";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface BankRateFormProps {
  defaultValues?: Partial<BankRateFormValues>;
  onSubmit: (data: BankRateFormValues) => void;
  loading?: boolean;
  submissionError?: unknown;
}

export function BankRateForm({ defaultValues, onSubmit, loading, submissionError }: BankRateFormProps) {
  const t = useTranslations("BankRateForm");
  const tc = useTranslations("Common");

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
    toast.error(err instanceof Error ? err.message : "Failed to save");
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("bankName")}</Label>
              <Input {...form.register("bankName")} />
            </div>
            <div className="space-y-2">
              <Label>{t("rate")}</Label>
              <Input type="number" step="0.01" {...form.register("rate")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("rateType")}</Label>
              <Select
                value={form.watch("rateType")}
                onValueChange={(v) => form.setValue("rateType", v as BankRateFormValues["rateType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t("types.fixed")}</SelectItem>
                  <SelectItem value="variable">{t("types.variable")}</SelectItem>
                  <SelectItem value="govt_program">{t("types.govtProgram")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("sortOrder")}</Label>
              <Input type="number" step="1" {...form.register("sortOrder")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("loanDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("maxLtv")}</Label>
              <Input type="number" step="0.01" {...form.register("maxLtv")} />
              <p className="text-xs text-muted-foreground">{t("maxLtvHint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("maxTermYears")}</Label>
              <Input type="number" step="1" {...form.register("maxTermYears")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("processingFee")}</Label>
              <Input type="number" step="0.01" {...form.register("processingFee")} />
              <p className="text-xs text-muted-foreground">{t("processingFeeHint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("insuranceRate")}</Label>
              <Input type="number" step="0.01" {...form.register("insuranceRate")} />
              <p className="text-xs text-muted-foreground">{t("insuranceRateHint")}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Input {...form.register("notes")} placeholder={t("notesPlaceholder")} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.watch("active")}
              onChange={(e) => form.setValue("active", e.target.checked)}
              className="rounded border-copper/30"
            />
            <Label htmlFor="active">{t("active")}</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {tc("saving")}
            </>
          ) : (
            t("saveBankRate")
          )}
        </Button>
      </div>
    </form>
  );
}
