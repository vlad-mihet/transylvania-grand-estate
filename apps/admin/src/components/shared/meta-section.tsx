"use client";

import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/shared/section-card";
import { DefinitionList } from "@/components/shared/definition-list";
import { RelativeTime } from "@/components/shared/relative-time";
import { IdChip } from "@/components/shared/mono";

interface MetaSectionProps {
  id: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

/**
 * Created / Updated / ID footer, shared across every detail view so these
 * bookkeeping fields live in a consistent spot.
 */
export function MetaSection({ id, createdAt, updatedAt }: MetaSectionProps) {
  const t = useTranslations("Common");

  return (
    <SectionCard title={t("meta")}>
      <DefinitionList
        items={[
          {
            label: t("createdLabel"),
            value: createdAt ? <RelativeTime value={createdAt} /> : null,
          },
          {
            label: t("updatedLabel"),
            value: updatedAt ? <RelativeTime value={updatedAt} /> : null,
          },
          {
            label: t("idLabel"),
            value: <IdChip>{id}</IdChip>,
            wide: true,
          },
        ]}
      />
    </SectionCard>
  );
}
