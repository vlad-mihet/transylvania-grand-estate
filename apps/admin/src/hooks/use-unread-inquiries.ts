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
    queryFn: () =>
      apiClient<PaginatedResponse<InquiryRow> | InquiryRow[]>(
        "/inquiries?status=new&limit=1",
      ),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const data = query.data;
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  return data.meta?.total ?? 0;
}
