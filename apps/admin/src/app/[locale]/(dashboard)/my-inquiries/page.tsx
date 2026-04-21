"use client";

import { useTranslations } from "next-intl";
import { InquiriesListPage } from "@/components/inquiries/inquiries-list-page";

/**
 * AGENT-facing inquiries view. Same body as `/inquiries`; the API auto-scopes
 * `/inquiries` via the `property.agentId` relation so only leads against
 * the agent's listings surface. Delete actions are `<Can>`-gated off for
 * AGENT automatically. Only the page title differs.
 */
export default function MyInquiriesPage() {
  const t = useTranslations("MyInquiries");
  return <InquiriesListPage title={t("title")} />;
}
