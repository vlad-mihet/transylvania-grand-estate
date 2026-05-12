"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { AttentionStrip } from "@/components/dashboard/attention-strip";
import { AuditHealthCard } from "@/components/dashboard/audit-health-card";
import { AuditLogFeed } from "@/components/dashboard/audit-log-feed";
import { RecentInquiries } from "@/components/dashboard/recent-inquiries";
import { PageHeader } from "@/components/shared/page-header";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { role } = usePermissions();
  const router = useRouter();

  // The shared dashboard's signals are designed for the admin perspective
  // (open inquiries, drafts, audit health). AGENT users have no business
  // surface here — bounce them to /my-listings, their authoritative landing
  // page. Login already does this on the happy path; this catches navigations
  // to / via the home logo or /403's "back to dashboard" link.
  useEffect(() => {
    if (role === "AGENT") {
      router.replace("/my-listings");
    }
  }, [role, router]);

  if (role === "AGENT") return null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("todayTitle")}
        description={t("todayDescription")}
      />

      <AttentionStrip />

      <RecentInquiries />

      <AuditHealthCard />
      <AuditLogFeed />
    </div>
  );
}
