import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@tge/api-client";
import type { ApiCity } from "@tge/types";

export function useCities(locale: string, params: { county?: string } = {}) {
  const qs = params.county ? `?county=${encodeURIComponent(params.county)}` : "";
  return useQuery({
    queryKey: ["cities", locale, params],
    queryFn: () => fetchApi<ApiCity[]>(`/cities${qs}`),
    staleTime: 5 * 60_000,
  });
}

export function useCity(locale: string, slug: string | null) {
  return useQuery({
    queryKey: ["city", locale, slug],
    queryFn: () => fetchApi<ApiCity>(`/cities/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}
