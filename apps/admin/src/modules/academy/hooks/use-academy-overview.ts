"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { academyKeys } from "./query-keys";
import type { AcademyOverview } from "../types";

export function useAcademyOverview() {
  return useQuery({
    queryKey: academyKeys.overview(),
    queryFn: () => apiClient<AcademyOverview>("/admin/academy/overview"),
  });
}
