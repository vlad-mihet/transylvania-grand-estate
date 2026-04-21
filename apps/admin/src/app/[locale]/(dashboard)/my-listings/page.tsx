"use client";

import { useTranslations } from "next-intl";
import { PropertiesListPage } from "@/components/properties/properties-list-page";

/**
 * AGENT-facing listing page. Same shared `<PropertiesListPage>` body as
 * `/properties`; the API auto-scopes `/properties` for AGENT users based on
 * the JWT `agentId`, and `<Can>` wrappers hide create/delete/feature actions
 * for the AGENT role. Only the title + omitted createHref differ.
 */
export default function MyListingsPage() {
  const t = useTranslations("MyListings");
  return <PropertiesListPage title={t("title")} />;
}
