"use client";

import { useTranslations } from "next-intl";
import { PropertiesListPage } from "@/components/properties/properties-list-page";

export default function PropertiesPage() {
  const t = useTranslations("Properties");
  return (
    <PropertiesListPage
      title={t("title")}
      createHref="/properties/new"
      createLabel={t("addProperty")}
    />
  );
}
