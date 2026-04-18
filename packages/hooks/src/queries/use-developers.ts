import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@tge/api-client";
import type { ApiDeveloper } from "@tge/types";

export function useDevelopers(params: { featured?: boolean; city?: string } = {}) {
  const q = new URLSearchParams();
  if (params.featured !== undefined) q.set("featured", String(params.featured));
  if (params.city) q.set("city", params.city);
  const qs = q.toString();
  return useQuery({
    queryKey: ["developers", params],
    queryFn: () => fetchApi<ApiDeveloper[]>(`/developers${qs ? `?${qs}` : ""}`),
    staleTime: 5 * 60_000,
  });
}

export function useDeveloper(slug: string | null) {
  return useQuery({
    queryKey: ["developer", slug],
    queryFn: () => fetchApi<ApiDeveloper>(`/developers/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}
