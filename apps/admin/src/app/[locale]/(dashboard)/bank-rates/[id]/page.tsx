"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { BankRateForm } from "@/components/forms/bank-rate-form";
import { PageHeader } from "@/components/shared/page-header";
import { BankRateFormValues } from "@/lib/validations/bank-rate";
import { useTranslations } from "next-intl";

export default function EditBankRatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("BankRates");

  const { data: bankRate, isLoading } = useQuery({
    queryKey: ["bank-rate", id],
    queryFn: () => apiClient<BankRateFormValues & { id: string }>(`/financial-data/bank-rates/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: BankRateFormValues) =>
      apiClient(`/financial-data/bank-rates/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-rate", id] });
      toast.success(t("updated"));
      router.push("/bank-rates");
    },
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!bankRate) return <p>{t("notFound")}</p>;

  return (
    <div className="space-y-6">
      <PageHeader title={t("editBankRate")} />
      <BankRateForm
        defaultValues={bankRate}
        onSubmit={(data) => updateMutation.mutate(data)}
        loading={updateMutation.isPending}
        submissionError={updateMutation.error}
      />
    </div>
  );
}
