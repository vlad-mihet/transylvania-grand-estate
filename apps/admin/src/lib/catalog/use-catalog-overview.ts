"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminCatalogOverview } from "@tge/types";

import { apiClient } from "@/lib/api-client";

/**
 * Single shared query against `/admin/catalog/overview`. Every card on
 * the Catalog module home (KPIs + recent properties + recent
 * testimonials) consumes this hook so React Query dedupes to one
 * round-trip per page load.
 */
export function useCatalogOverview() {
  return useQuery({
    queryKey: ["admin-catalog-overview"],
    queryFn: () =>
      apiClient<AdminCatalogOverview>("/admin/catalog/overview"),
    staleTime: 60_000,
  });
}
