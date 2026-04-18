"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { BankRateForm } from "@/components/forms/bank-rate-form";
import { PageHeader } from "@/components/shared/page-header";
import { BankRateFormValues } from "@/lib/validations/bank-rate";
import { useTranslations } from "next-intl";

export default function NewBankRatePage() {
  const router = useRouter();
  const t = useTranslations("BankRates");

  const createMutation = useMutation({
    mutationFn: (data: BankRateFormValues) =>
      apiClient("/financial-data/bank-rates", { method: "POST", body: data }),
    onSuccess: () => {
      toast.success(t("created"));
      router.push("/bank-rates");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("newBankRate")} />
      <BankRateForm
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
      />
    </div>
  );
}
