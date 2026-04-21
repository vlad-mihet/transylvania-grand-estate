"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { BankRateForm } from "@/components/forms/bank-rate-form";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { BankRateFormValues } from "@/lib/validations/bank-rate";

export default function EditBankRatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("BankRates");

  const updateMutation = useMutation({
    mutationFn: (data: BankRateFormValues) =>
      apiClient(`/financial-data/bank-rates/${id}`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-rate", id] });
      queryClient.invalidateQueries({ queryKey: ["bank-rates"] });
      toast.success(t("updated"));
      router.push(`/bank-rates/${id}`);
    },
  });

  return (
    <DetailPageShell<BankRateFormValues & { id: string }>
      queryKey={["bank-rate", id]}
      queryFn={() =>
        apiClient<BankRateFormValues & { id: string }>(
          `/financial-data/bank-rates/${id}`,
        )
      }
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(bankRate) => (
        <FormPageShell
          title={t("editBankRate")}
          actions={
            <EntityDeleteButton
              apiPath={`/financial-data/bank-rates/${id}`}
              permission="bank-rate.delete"
              listHref="/bank-rates"
              invalidateKeys={[["bank-rates"], ["bank-rate", id]]}
              confirmTitle={t("deleteTitle")}
              successMessage={t("deleted")}
              errorMessage={t("deleteFailed")}
            />
          }
        >
          <BankRateForm
            cancelHref={`/bank-rates/${id}`}
            defaultValues={bankRate}
            onSubmit={(data) => updateMutation.mutate(data)}
            loading={updateMutation.isPending}
            submissionError={updateMutation.error}
          />
        </FormPageShell>
      )}
    />
  );
}
