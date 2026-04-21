"use client";

import { useTranslations } from "next-intl";
import type { ApiDeveloper } from "@tge/types";
import { Avatar } from "@/components/shared/avatar";
import { SectionCard } from "@/components/shared/section-card";
import { DefinitionList } from "@/components/shared/definition-list";
import { BilingualView } from "@/components/shared/bilingual-view";

interface DeveloperDetailViewProps {
  developer: ApiDeveloper;
}

export function DeveloperDetailView({ developer }: DeveloperDetailViewProps) {
  const t = useTranslations("DeveloperForm");
  const tc = useTranslations("Common");

  const yesNo = (value: boolean | null | undefined) =>
    value == null ? undefined : value ? tc("yes") : tc("no");

  return (
    <>
      <SectionCard title={t("title")}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={developer.logo}
              alt={developer.name}
              size="xl"
              shape="rounded"
              fit="contain"
            />
            <p className="text-base font-semibold text-foreground">
              {developer.name}
            </p>
          </div>
          <DefinitionList
            items={[
              { label: t("name"), value: developer.name },
              {
                label: t("slug"),
                value: (
                  <code className="mono text-xs text-muted-foreground">
                    {developer.slug}
                  </code>
                ),
              },
              { label: t("city"), value: developer.city || null },
              {
                label: t("website"),
                value: developer.website ? (
                  <a
                    href={developer.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-copper underline-offset-2 hover:underline"
                  >
                    {developer.website}
                  </a>
                ) : null,
              },
              { label: t("projectCount"), value: developer.projectCount },
              {
                label: t("featuredDeveloper"),
                value: yesNo(developer.featured),
              },
            ]}
          />
          <BilingualView
            label={t("shortDescription")}
            valueEn={developer.shortDescription?.en}
            valueRo={developer.shortDescription?.ro}
            valueFr={developer.shortDescription?.fr}
            valueDe={developer.shortDescription?.de}
            multiline
          />
          <BilingualView
            label={t("description")}
            valueEn={developer.description?.en}
            valueRo={developer.description?.ro}
            valueFr={developer.description?.fr}
            valueDe={developer.description?.de}
            multiline
          />
        </div>
      </SectionCard>
    </>
  );
}
