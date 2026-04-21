"use client";

import { useTranslations } from "next-intl";
import { InquiriesListPage } from "@/components/inquiries/inquiries-list-page";

/**
 * Admin-facing inquiries list. Agents land on `/my-inquiries` instead, which
 * renders the same shared body with an agent-scoped title — the API
 * auto-scopes `/inquiries` via `property.agentId` for AGENT users and `<Can>`
 * wrappers hide admin-only bulk actions.
 */
export default function InquiriesPage() {
  const t = useTranslations("Inquiries");
  return <InquiriesListPage title={t("title")} />;
}
