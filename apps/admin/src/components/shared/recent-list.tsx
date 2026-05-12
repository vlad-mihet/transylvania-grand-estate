"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@tge/ui";

import { Link } from "@/i18n/navigation";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";

export interface RecentListItem {
  id: string;
  href: string;
  title: string;
  /** Status pill rendered to the right of the title. Pass undefined to
   * skip — useful for sources that don't carry a status (sign-ins,
   * testimonials, etc.). */
  status?: string;
  /** Arbitrary trailing content rendered between status and timestamp.
   * Useful for source chips, rating pills, or any badge a list needs. */
  badges?: ReactNode;
  timestamp: string | null;
}

interface RecentListProps {
  items: RecentListItem[];
  loading: boolean;
  emptyLabel: string;
  /** Skeleton row count while loading. Default 4 keeps the visual
   * footprint stable across most list cards (Articles, Courses,
   * Properties — all bounded at 5 items). */
  skeletonRows?: number;
}

/**
 * Generic top-N list rendered in module-home cards. Extracted from the
 * inline implementation in `apps/admin/src/app/[locale]/(dashboard)/content/page.tsx`
 * so Phase 3 module homes (catalog, locations, finance) reuse the same
 * shape without duplicating the JSX.
 *
 * Each row is a Link → href; clicking navigates to the entity. Skeleton
 * + empty states keep the same 2-line shape so the card height is
 * stable.
 */
export function RecentList({
  items,
  loading,
  emptyLabel,
  skeletonRows = 4,
}: RecentListProps) {
  if (loading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 py-1.5"
          >
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3.5 w-16" />
          </li>
        ))}
      </ul>
    );
  }
  if (items.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href as Parameters<typeof Link>[0]["href"]}
            className="group flex items-center justify-between gap-3 py-2 text-sm hover:text-copper"
          >
            <span className="truncate font-medium group-hover:underline">
              {item.title}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {item.status ? <StatusBadge status={item.status} /> : null}
              {item.badges}
              {item.timestamp ? (
                <RelativeTime
                  value={item.timestamp}
                  className="text-[11px] text-muted-foreground"
                />
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
