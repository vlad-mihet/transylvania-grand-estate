import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@tge/api-client";
import type { ApiProperty } from "@tge/types";

export function useProperty(slug: string | null) {
  return useQuery({
    queryKey: ["property", slug],
    queryFn: () => fetchApi<ApiProperty>(`/properties/${slug}`),
    enabled: !!slug,
    staleTime: 60_000,
  });
}
