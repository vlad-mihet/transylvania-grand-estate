"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ApiProperty } from "@tge/types";
import { SectionCard } from "@/components/shared/section-card";
import {
  DefinitionList,
  type DefinitionListItem,
} from "@/components/shared/definition-list";
import { BilingualView } from "@/components/shared/bilingual-view";
import { StatusBadge } from "@/components/shared/status-badge";
import { MetaSection } from "@/components/shared/meta-section";

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

  const detailsItems: DefinitionListItem[] = [
    { label: t("type"), value: t(`types.${property.type}`) },
    {
      label: t("status"),
      value: <StatusBadge status={property.status} />,
    },
    {
      label: t("developer"),
      value: property.developer?.name ?? null,
    },
    {
      label: t("agent"),
      value: property.agent
        ? `${property.agent.firstName} ${property.agent.lastName}`.trim()
        : null,
    },
    {
      label: `${t("price")} (${property.currency})`,
      value: formattedPrice,
    },
    { label: t("featured"), value: yesNo(property.featured) },
    { label: t("newListing"), value: yesNo(property.isNew) },
  ];

  const locationItems: DefinitionListItem[] = [
    { label: t("city"), value: property.city || null },
    { label: t("neighborhood"), value: property.neighborhood || null },
    { label: t("latitude"), value: property.latitude || null },
    { label: t("longitude"), value: property.longitude || null },
  ];

  const specItems: DefinitionListItem[] = [
    {
      label: t("area"),
      value: property.area ? `${property.area} m²` : null,
    },
    {
      label: t("landArea"),
      value: property.landArea ? `${property.landArea} m²` : null,
    },
    { label: t("pool"), value: yesNo(property.pool) },
  ];

  if (!isTerrain) {
    specItems.unshift(
      { label: t("bedrooms"), value: property.bedrooms || null },
      { label: t("bathrooms"), value: property.bathrooms || null },
    );
    specItems.push(
      { label: t("floors"), value: property.floors || null },
      { label: t("yearBuilt"), value: property.yearBuilt || null },
      { label: t("garageSpots"), value: property.garage || null },
    );
  }

  return (
    <>
      <SectionCard title={t("basicInfo")}>
        <div className="space-y-4">
          <BilingualView
            label={t("title")}
            valueEn={property.title.en}
            valueRo={property.title.ro}
            valueFr={property.title.fr}
            valueDe={property.title.de}
          />
          <DefinitionList
            items={[
              {
                label: t("slug"),
                value: (
                  <code className="mono text-xs text-muted-foreground">
                    {property.slug}
                  </code>
                ),
                wide: true,
              },
            ]}
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
        </div>
      </SectionCard>

      <SectionCard title={t("details")}>
        <DefinitionList items={detailsItems} />
      </SectionCard>

      <SectionCard title={t("location")}>
        <div className="space-y-4">
          <DefinitionList items={locationItems} />
          <BilingualView
            label={t("address")}
            valueEn={property.address?.en}
            valueRo={property.address?.ro}
            valueFr={property.address?.fr}
            valueDe={property.address?.de}
          />
        </div>
      </SectionCard>

      <SectionCard title={t("specifications")}>
        <DefinitionList items={specItems} />
      </SectionCard>

      <MetaSection
        id={property.id}
        createdAt={property.createdAt}
        updatedAt={property.updatedAt}
      />
    </>
  );
}
