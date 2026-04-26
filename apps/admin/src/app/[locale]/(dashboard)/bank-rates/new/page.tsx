"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { BankRateForm } from "@/components/forms/bank-rate-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { BankRateFormValues } from "@/lib/validations/bank-rate";

export default function NewBankRatePage() {
  const router = useRouter();
  const t = useTranslations("BankRates");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("bank-rate.create")) router.replace("/403");
  }, [can, router]);

  const createMutation = useMutation({
    mutationFn: (data: BankRateFormValues) =>
      apiClient<{ id: string }>("/financial-data/bank-rates", {
        method: "POST",
        body: data,
      }),
    onSuccess: (bankRate) => {
      toast.success(t("created"));
      router.push(`/bank-rates/${bankRate.id}`);
    },
  });

  if (!can("bank-rate.create")) return null;

  return (
    <FormPageShell title={t("newBankRate")}>
      <BankRateForm
        cancelHref="/bank-rates"
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
      />
    </FormPageShell>
  );
}
