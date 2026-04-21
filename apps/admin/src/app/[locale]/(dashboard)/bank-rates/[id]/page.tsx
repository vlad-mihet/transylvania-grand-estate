"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@tge/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DetailView } from "@/components/shared/detail-view";
import { Can } from "@/components/shared/can";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import {
  BankRateDetailView,
  type BankRateWithId,
} from "@/components/bank-rates/bank-rate-detail-view";

export default function BankRateViewPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("BankRates");
  const tc = useTranslations("Common");

  return (
    <DetailPageShell<BankRateWithId>
      queryKey={["bank-rate", id]}
      queryFn={() =>
        apiClient<BankRateWithId>(`/financial-data/bank-rates/${id}`)
      }
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(bankRate) => (
        <DetailView>
          <PageHeader
            title={bankRate.bankName}
            actions={
              <>
                <EntityDeleteButton
                  apiPath={`/financial-data/bank-rates/${bankRate.id}`}
                  permission="bank-rate.delete"
                  listHref="/bank-rates"
                  invalidateKeys={[
                    ["bank-rates"],
                    ["bank-rate", bankRate.id],
                  ]}
                  confirmTitle={t("deleteTitle")}
                  successMessage={t("deleted")}
                  errorMessage={t("deleteFailed")}
                />
                <Can action="bank-rate.update">
                  <Button asChild size="sm">
                    <Link href={`/bank-rates/${bankRate.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">{tc("edit")}</span>
                    </Link>
                  </Button>
                </Can>
              </>
            }
          />
          <BankRateDetailView bankRate={bankRate} />
        </DetailView>
      )}
    />
  );
}
