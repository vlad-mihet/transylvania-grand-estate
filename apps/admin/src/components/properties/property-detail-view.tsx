"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ApiProperty } from "@tge/types";
import { BilingualView } from "@/components/shared/bilingual-view";
import { StatusBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { IdChip } from "@/components/shared/mono";
import {
  DetailLayout,
  DetailMetaCard,
  MetaRow,
} from "@/components/shared/detail-layout";

const INTL_LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  ro: "ro-RO",
  fr: "fr-FR",
  de: "de-DE",
};

interface PropertyDetailViewProps {
  property: ApiProperty;
}

export function PropertyDetailView({ property }: PropertyDetailViewProps) {
  const t = useTranslations("PropertyForm");
  const tc = useTranslations("Common");
  const locale = useLocale();

  const isTerrain = property.type === "terrain";
  const intlLocale = INTL_LOCALE_MAP[locale] ?? "en-US";
  const yesNo = (value: boolean | null | undefined) =>
    value == null ? undefined : value ? tc("yes") : tc("no");

  const formattedPrice = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: property.currency || "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(property.price);

  return (
    <DetailLayout
      main={
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex flex-col gap-5">
            <BilingualView
              label={t("title")}
              valueEn={property.title.en}
              valueRo={property.title.ro}
              valueFr={property.title.fr}
              valueDe={property.title.de}
            />
            <BilingualView
              label={t("shortDescription")}
              valueEn={property.shortDescription.en}
              valueRo={property.shortDescription.ro}
              valueFr={property.shortDescription.fr}
              valueDe={property.shortDescription.de}
              multiline
            />
            <BilingualView
              label={t("description")}
              valueEn={property.description.en}
              valueRo={property.description.ro}
              valueFr={property.description.fr}
              valueDe={property.description.de}
              multiline
            />
            <BilingualView
              label={t("address")}
              valueEn={property.address?.en}
              valueRo={property.address?.ro}
              valueFr={property.address?.fr}
              valueDe={property.address?.de}
            />
          </div>
        </div>
      }
      meta={
        <>
          <DetailMetaCard title={t("details")}>
            <MetaRow
              label={t("slug")}
              value={
                <code className="mono text-xs text-muted-foreground">
                  {property.slug}
                </code>
              }
            />
            <MetaRow label={t("type")} value={t(`types.${property.type}`)} />
            <MetaRow
              label={t("status")}
              value={<StatusBadge status={property.status} />}
            />
            <MetaRow
              label={t("developer")}
              value={property.developer?.name ?? null}
            />
            <MetaRow
              label={t("agent")}
              value={
                property.agent
                  ? `${property.agent.firstName} ${property.agent.lastName}`.trim()
                  : null
              }
            />
            <MetaRow
              label={`${t("price")} (${property.currency})`}
              value={formattedPrice}
            />
            <MetaRow label={t("featured")} value={yesNo(property.featured)} />
            <MetaRow label={t("newListing")} value={yesNo(property.isNew)} />
          </DetailMetaCard>

          <DetailMetaCard title={t("location")}>
            <MetaRow label={t("city")} value={property.city || null} />
            <MetaRow
              label={t("neighborhood")}
              value={property.neighborhood || null}
            />
            <MetaRow label={t("latitude")} value={property.latitude || null} />
            <MetaRow
              label={t("longitude")}
              value={property.longitude || null}
            />
          </DetailMetaCard>

          <DetailMetaCard title={t("specifications")}>
            {!isTerrain ? (
              <>
                <MetaRow
                  label={t("bedrooms")}
                  value={property.bedrooms || null}
                />
                <MetaRow
                  label={t("bathrooms")}
                  value={property.bathrooms || null}
                />
              </>
            ) : null}
            <MetaRow
              label={t("area")}
              value={property.area ? `${property.area} m²` : null}
            />
            <MetaRow
              label={t("landArea")}
              value={property.landArea ? `${property.landArea} m²` : null}
            />
            {!isTerrain ? (
              <>
                <MetaRow label={t("floors")} value={property.floors || null} />
                <MetaRow
                  label={t("yearBuilt")}
                  value={property.yearBuilt || null}
                />
                <MetaRow
                  label={t("garageSpots")}
                  value={property.garage || null}
                />
              </>
            ) : null}
            <MetaRow label={t("pool")} value={yesNo(property.pool)} />
          </DetailMetaCard>

          <DetailMetaCard title={tc("meta")}>
            <MetaRow
              label={tc("createdLabel")}
              value={
                property.createdAt ? (
                  <RelativeTime value={property.createdAt} />
                ) : null
              }
            />
            <MetaRow
              label={tc("updatedLabel")}
              value={
                property.updatedAt ? (
                  <RelativeTime value={property.updatedAt} />
                ) : null
              }
            />
            <MetaRow
              label={tc("idLabel")}
              value={<IdChip>{property.id}</IdChip>}
            />
          </DetailMetaCard>
        </>
      }
    />
  );
}
