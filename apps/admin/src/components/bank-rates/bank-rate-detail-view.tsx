"use client";

import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/shared/section-card";
import { DefinitionList } from "@/components/shared/definition-list";
import type { BankRateFormValues } from "@/lib/validations/bank-rate";

export type BankRateWithId = BankRateFormValues & { id: string };

interface BankRateDetailViewProps {
  bankRate: BankRateWithId;
}

export function BankRateDetailView({ bankRate }: BankRateDetailViewProps) {
  const t = useTranslations("BankRateForm");
  const tc = useTranslations("Common");

  const yesNo = (value: boolean | null | undefined) =>
    value == null ? undefined : value ? tc("yes") : tc("no");

  const rateTypeKey =
    bankRate.rateType === "govt_program" ? "govtProgram" : bankRate.rateType;

  return (
    <>
      <SectionCard title={t("title")}>
        <DefinitionList
          items={[
            { label: t("bankName"), value: bankRate.bankName },
            {
              label: t("rate"),
              value: `${bankRate.rate}%`,
            },
            {
              label: t("rateType"),
              value: t(`types.${rateTypeKey}`),
            },
            { label: t("sortOrder"), value: bankRate.sortOrder },
            { label: t("active"), value: yesNo(bankRate.active) },
          ]}
        />
      </SectionCard>

      <SectionCard title={t("loanDetails")}>
        <DefinitionList
          items={[
            {
              label: t("maxLtv"),
              value:
                bankRate.maxLtv == null
                  ? null
                  : `${(bankRate.maxLtv * 100).toFixed(0)}%`,
            },
            {
              label: t("maxTermYears"),
              value: bankRate.maxTermYears ?? null,
            },
            {
              label: t("processingFee"),
              value:
                bankRate.processingFee == null
                  ? null
                  : `${bankRate.processingFee}%`,
            },
            {
              label: t("insuranceRate"),
              value:
                bankRate.insuranceRate == null
                  ? null
                  : `${bankRate.insuranceRate}%`,
            },
            {
              label: t("notes"),
              value: bankRate.notes || null,
              wide: true,
            },
          ]}
        />
      </SectionCard>
    </>
  );
}
