"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@tge/ui";
import {
  AlertTriangle,
  FileEdit,
  Languages,
  Mail,
  MessageSquare,
  ShieldOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardAttention } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { cn } from "@tge/utils";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";

type Tone = "default" | "warning" | "danger";

interface TileSpec {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  value: number;
  tone?: Tone;
}

function AttentionTile({ spec }: { spec: TileSpec }) {
  const tone: Tone = spec.tone ?? (spec.value > 0 ? "warning" : "default");
  return (
    <Link href={spec.href as Parameters<typeof Link>[0]["href"]}>
      <Card
        className={cn(
          "card-hover h-full rounded-md border-border shadow-none transition-colors",
          tone === "warning" &&
            spec.value > 0 &&
            "border-copper/40 bg-[color-mix(in_srgb,var(--color-copper)_4%,transparent)]",
          tone === "danger" &&
            spec.value > 0 &&
            "border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20",
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-1.5">
          <CardTitle className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {spec.label}
          </CardTitle>
          <spec.icon
            className={cn(
              "h-4 w-4",
              spec.value > 0 && tone === "warning"
                ? "text-copper"
                : spec.value > 0 && tone === "danger"
                  ? "text-[var(--color-danger)]"
                  : "text-muted-foreground/70",
            )}
          />
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "mono text-2xl font-semibold tabular-nums",
              spec.value > 0
                ? tone === "danger"
                  ? "text-[var(--color-danger)]"
                  : "text-foreground"
                : "text-muted-foreground/60",
            )}
          >
            {spec.value}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * "What needs my attention" strip. Backed by a single aggregator endpoint
 * (`GET /admin/dashboard/attention`) that role-gates fields server-side and
 * returns `null` for fields the caller can't read. Tiles render only when
 * the server returned a numeric value AND the client capability matches —
 * the dual check is intentionally redundant so a future role change in the
 * matrix can't accidentally surface a tile that should be hidden.
 */
export function AttentionStrip() {
  const t = useTranslations("Dashboard.attention");
  const { can } = usePermissions();

  const query = useQuery({
    queryKey: ["dashboard-attention"],
    queryFn: () => apiClient<DashboardAttention>("/admin/dashboard/attention"),
    staleTime: 30_000,
  });

  if (query.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-md border border-border bg-muted/30"
          />
        ))}
      </div>
    );
  }

  const data = query.data;
  const tiles: TileSpec[] = [];
  if (data && can("inquiry.read")) {
    tiles.push({
      key: "inquiries",
      label: t("newInquiries"),
      icon: MessageSquare,
      href: "/inquiries?status=new",
      value: data.newInquiries,
    });
  }
  if (data && can("article.read")) {
    tiles.push({
      key: "drafts",
      label: t("draftArticles"),
      icon: FileEdit,
      href: "/articles?status=draft",
      value: data.draftArticles,
    });
    tiles.push({
      key: "missing-en",
      label: t("missingEn"),
      icon: Languages,
      href: "/content#en-queue",
      value: data.missingEnTotal,
    });
  }
  if (
    data &&
    data.pendingAcademyInvitations !== null &&
    can("academy.user.manage")
  ) {
    tiles.push({
      key: "academy-invites",
      label: t("pendingAcademyInvites"),
      icon: Mail,
      href: "/people/invitations?tab=academy",
      value: data.pendingAcademyInvitations,
    });
  }
  if (data && data.suspendedUsers !== null && can("users.manage")) {
    tiles.push({
      key: "suspended",
      label: t("suspendedUsers"),
      icon: ShieldOff,
      href: "/people/team",
      value: data.suspendedUsers,
    });
  }
  if (
    data &&
    data.auditFailuresSinceBoot !== null &&
    can("audit-log.read-health") &&
    data.auditFailuresSinceBoot > 0
  ) {
    tiles.push({
      key: "audit-failures",
      label: t("auditFailures"),
      icon: AlertTriangle,
      href: "/audit-logs",
      value: data.auditFailuresSinceBoot,
      tone: "danger",
    });
  }

  if (tiles.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("allClear")}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((spec) => (
        <AttentionTile key={spec.key} spec={spec} />
      ))}
    </div>
  );
}
