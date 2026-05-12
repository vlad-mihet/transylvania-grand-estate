"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";

interface CountEnvelope {
  data: unknown[];
  meta?: { total?: number };
}

interface SiteConfigShape {
  tgeHomepageCities?: string[];
  reveryHomepageCities?: string[];
}

export interface LocationsOverview {
  countiesTotal: number | undefined;
  citiesTotal: number | undefined;
  /** Number of cities curated for TGE's brand homepage. Undefined while
   * the site-config query is loading; null when the caller lacks
   * site-config.read. */
  tgeCuratedCount: number | null | undefined;
  reveryCuratedCount: number | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Composes the Locations module home from existing public endpoints.
 * Per the locked plan's "mixed" API strategy, Locations does NOT get
 * its own aggregator: counties + cities + site-config are three small
 * fetches, and one of them (site-config) is already cached if the
 * brand-visibility page was visited in the same session.
 */
export function useLocationsOverview(): LocationsOverview {
  const { can } = usePermissions();
  const canCounties = can("county.read");
  const canCities = can("city.read");
  const canSiteConfig = can("site-config.read");

  const countiesQuery = useQuery({
    queryKey: ["counties-count"],
    queryFn: () =>
      apiClient<CountEnvelope>("/counties?light=true&limit=1", {
        envelope: true,
      }),
    enabled: canCounties,
    staleTime: 60_000,
  });

  const citiesQuery = useQuery({
    queryKey: ["cities-count"],
    queryFn: () =>
      apiClient<CountEnvelope>("/cities?limit=1", { envelope: true }),
    enabled: canCities,
    staleTime: 60_000,
  });

  // Reuse the same key the brand-visibility page uses so React Query
  // dedupes if both surfaces are open.
  const siteConfigQuery = useQuery({
    queryKey: ["site-config"],
    queryFn: () => apiClient<SiteConfigShape>("/site-config"),
    enabled: canSiteConfig,
    staleTime: 60_000,
  });

  return {
    countiesTotal: countiesQuery.data?.meta?.total,
    citiesTotal: citiesQuery.data?.meta?.total,
    tgeCuratedCount: canSiteConfig
      ? (siteConfigQuery.data?.tgeHomepageCities?.length ?? undefined)
      : null,
    reveryCuratedCount: canSiteConfig
      ? (siteConfigQuery.data?.reveryHomepageCities?.length ?? undefined)
      : null,
    isLoading:
      (canCounties && countiesQuery.isLoading) ||
      (canCities && citiesQuery.isLoading) ||
      (canSiteConfig && siteConfigQuery.isLoading),
    isError:
      (canCounties && countiesQuery.isError) ||
      (canCities && citiesQuery.isError) ||
      (canSiteConfig && siteConfigQuery.isError),
  };
}
