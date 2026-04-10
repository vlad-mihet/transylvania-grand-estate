"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@tge/ui";
import {
  Building2,
  HardHat,
  UserCircle,
  MapPin,
  MessageSquareQuote,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { QueryError } from "@/components/shared/query-error";

interface Stats {
  properties: number;
  developers: number;
  agents: number;
  cities: number;
  testimonials: number;
}

function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [properties, developers, agents, cities, testimonials] =
        await Promise.all([
          apiClient<unknown[]>("/properties?limit=100"),
          apiClient<unknown[]>("/developers"),
          apiClient<unknown[]>("/agents"),
          apiClient<unknown[]>("/cities"),
          apiClient<unknown[]>("/testimonials"),
        ]);
      return {
        properties: Array.isArray(properties) ? properties.length : 0,
        developers: Array.isArray(developers) ? developers.length : 0,
        agents: Array.isArray(agents) ? agents.length : 0,
        cities: Array.isArray(cities) ? cities.length : 0,
        testimonials: Array.isArray(testimonials) ? testimonials.length : 0,
      } satisfies Stats;
    },
  });
}

export default function DashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useStats();
  const t = useTranslations("Dashboard");

  const statCards = [
    { key: "properties" as const, label: t("properties"), icon: Building2, href: "/properties" as const, color: "text-copper" },
    { key: "developers" as const, label: t("developers"), icon: HardHat, href: "/developers" as const, color: "text-copper" },
    { key: "agents" as const, label: t("agents"), icon: UserCircle, href: "/agents" as const, color: "text-copper" },
    { key: "cities" as const, label: t("cities"), icon: MapPin, href: "/cities" as const, color: "text-copper" },
    { key: "testimonials" as const, label: t("testimonials"), icon: MessageSquareQuote, href: "/testimonials" as const, color: "text-copper" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[0.01em]">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {isError ? (
        <QueryError onRetry={refetch} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((card) => (
            <Link key={card.key} href={card.href}>
              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-3xl font-semibold font-serif">
                      {stats?.[card.key] ?? 0}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
