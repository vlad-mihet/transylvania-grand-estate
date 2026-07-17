"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import type { PaginatedResponse } from "@/hooks/use-resource-list";

interface InquiryRow {
  id: string;
}

/**
 * Unread-inquiry count for the sidebar badge. Hits the list endpoint with
 * a minimal `limit=1` so the server only pays for the count — the actual
 * rows are thrown away. Gated behind the `inquiry.read` capability so
 * EDITOR/AGENT shells don't fire a 403.
 */
export function useUnreadInquiries(): number {
  const { can } = usePermissions();
  const enabled = can("inquiry.read");

  const query = useQuery({
    queryKey: ["inquiries-unread"],
    // envelope:true so we read `meta.total` (the real unread count) instead of
    // the returned row array length — without it the badge always showed "1"
    // because limit=1 returns a single row (BUG-121).
    queryFn: () =>
      apiClient<PaginatedResponse<InquiryRow>>("/inquiries?status=new&limit=1", {
        envelope: true,
      }),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return query.data?.meta?.total ?? 0;
}
