import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@tge/api-client";
import type { ApiCity } from "@tge/types";

export function useCities(params: { county?: string } = {}) {
  const qs = params.county ? `?county=${encodeURIComponent(params.county)}` : "";
  return useQuery({
    queryKey: ["cities", params],
    queryFn: () => fetchApi<ApiCity[]>(`/cities${qs}`),
    staleTime: 5 * 60_000,
  });
}

export function useCity(slug: string | null) {
  return useQuery({
    queryKey: ["city", slug],
    queryFn: () => fetchApi<ApiCity>(`/cities/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}
