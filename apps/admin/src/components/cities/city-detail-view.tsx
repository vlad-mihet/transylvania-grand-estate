"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ApiCity } from "@tge/types";
import { SectionCard } from "@/components/shared/section-card";
import { DefinitionList } from "@/components/shared/definition-list";
import { BilingualView } from "@/components/shared/bilingual-view";

interface CityDetailViewProps {
  city: ApiCity;
}

export function CityDetailView({ city }: CityDetailViewProps) {
  const t = useTranslations("CityForm");

  return (
    <>
      <SectionCard title={t("title")}>
        <div className="space-y-4">
          {city.image && (
            <Image
              src={city.image}
              alt={city.name}
              width={600}
              height={240}
              className="h-40 w-full rounded-md border border-border object-cover"
            />
          )}
          <DefinitionList
            items={[
              { label: t("name"), value: city.name },
              {
                label: t("slug"),
                value: (
                  <code className="mono text-xs text-muted-foreground">
                    {city.slug}
                  </code>
                ),
              },
              {
                label: t("county"),
                value: city.county?.name ?? null,
              },
              {
                label: t("propertyCount"),
                value: city.propertyCount,
              },
            ]}
          />
          <BilingualView
            label={t("description")}
            valueEn={city.description?.en}
            valueRo={city.description?.ro}
            valueFr={city.description?.fr}
            valueDe={city.description?.de}
            multiline
          />
        </div>
      </SectionCard>
    </>
  );
}
