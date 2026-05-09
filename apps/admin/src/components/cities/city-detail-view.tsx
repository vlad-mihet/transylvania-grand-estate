"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ApiCity } from "@tge/types";
import { BilingualView } from "@/components/shared/bilingual-view";
import { BrandBadges } from "@/components/shared/brand-badges";
import {
  DetailLayout,
  DetailMetaCard,
  MetaRow,
} from "@/components/shared/detail-layout";

interface CityDetailViewProps {
  city: ApiCity;
}

export function CityDetailView({ city }: CityDetailViewProps) {
  const t = useTranslations("CityForm");
  const tc = useTranslations("Common");

  return (
    <DetailLayout
      main={
        <>
          {city.image ? (
            <div className="overflow-hidden rounded-md border border-border bg-muted">
              <Image
                src={city.image}
                alt={city.name}
                width={1280}
                height={720}
                className="aspect-video w-full object-cover"
                priority
              />
            </div>
          ) : null}
          <div className="rounded-md border border-border bg-card p-5">
            <BilingualView
              label={t("description")}
              valueEn={city.description?.en}
              valueRo={city.description?.ro}
              valueFr={city.description?.fr}
              valueDe={city.description?.de}
              multiline
            />
          </div>
        </>
      }
      meta={
        <DetailMetaCard title={tc("meta")}>
          <MetaRow label={t("name")} value={city.name} />
          <MetaRow
            label={t("slug")}
            value={
              <code className="mono text-xs text-muted-foreground">
                {city.slug}
              </code>
            }
          />
          <MetaRow label={t("county")} value={city.county?.name ?? null} />
          <MetaRow label={t("propertyCount")} value={city.propertyCount} />
          <MetaRow
            label={t("brands")}
            value={
              city.brands && city.brands.length > 0 ? (
                <BrandBadges brands={city.brands} />
              ) : null
            }
          />
        </DetailMetaCard>
      }
    />
  );
}
