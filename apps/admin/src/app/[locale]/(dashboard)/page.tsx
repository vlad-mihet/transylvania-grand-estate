"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Building2,
  HardHat,
  MapPin,
  MessageSquare,
  MessageSquareQuote,
  UserCircle,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { AuditHealthCard } from "@/components/dashboard/audit-health-card";
import { AuditLogFeed } from "@/components/dashboard/audit-log-feed";
import { RecentArticles } from "@/components/dashboard/recent-articles";
import { RecentInquiries } from "@/components/dashboard/recent-inquiries";
import { RecentProperties } from "@/components/dashboard/recent-properties";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Can } from "@/components/shared/can";
import { PageHeader } from "@/components/shared/page-header";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { can } = usePermissions();

  // Secondary signal for the Inquiries tile — how many are still unread.
  // Reads `meta.total` from the paginated envelope so the count is exact
  // regardless of page size; `limit=1` keeps the payload trivial.
  const newInquiries = useQuery({
    queryKey: ["dashboard-inquiries-new-count"],
    queryFn: () =>
      apiClient<{ meta?: { total?: number } }>(
        "/inquiries?status=new&limit=1",
        { envelope: true },
      ),
    enabled: can("inquiry.read"),
    staleTime: 30_000,
  });
  const newInquiriesCount = newInquiries.data?.meta?.total ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Can action="property.read">
          <StatTile
            label={t("properties")}
            icon={Building2}
            href="/properties"
            endpoint="/properties"
          />
        </Can>
        <Can action="developer.read">
          <StatTile
            label={t("developers")}
            icon={HardHat}
            href="/developers"
            endpoint="/developers"
          />
        </Can>
        <Can action="agent.read">
          <StatTile
            label={t("agents")}
            icon={UserCircle}
            href="/agents"
            endpoint="/agents"
          />
        </Can>
        <Can action="city.read">
          <StatTile
            label={t("cities")}
            icon={MapPin}
            href="/cities"
            endpoint="/cities"
          />
        </Can>
        <Can action="testimonial.read">
          <StatTile
            label={t("testimonials")}
            icon={MessageSquareQuote}
            href="/testimonials"
            endpoint="/testimonials"
          />
        </Can>
        <Can action="inquiry.read">
          <StatTile
            label={t("inquiries")}
            icon={MessageSquare}
            href="/inquiries"
            endpoint="/inquiries"
            subLine={
              newInquiriesCount > 0 ? (
                <span className="text-copper">
                  {t("inquiriesNew", { count: newInquiriesCount })}
                </span>
              ) : null
            }
          />
        </Can>
      </div>

      <RecentInquiries />

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentProperties />
        <RecentArticles />
      </div>

      <AuditHealthCard />
      <AuditLogFeed />
    </div>
  );
}
