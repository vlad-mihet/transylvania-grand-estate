"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@tge/ui";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";

type LinkHref = ComponentProps<typeof Link>["href"];

interface BaseStatTileProps {
  label: string;
  icon: LucideIcon;
  href: LinkHref;
  /** Secondary line rendered below the count (e.g. "5 new"). */
  subLine?: ReactNode;
}

interface FetchingStatTileProps extends BaseStatTileProps {
  /** Endpoint to hit for the count. The count is read from the paginated
   *  envelope's `meta.total` — `limit=1` keeps the payload minimal. */
  endpoint: string;
  /** Optional react-query cache key — defaults to the endpoint string. */
  queryKey?: readonly unknown[];
  value?: never;
  isLoading?: never;
}

interface PreFetchedStatTileProps extends BaseStatTileProps {
  /** Pre-fetched count from an upstream aggregator (e.g. Catalog home).
   * When set, StatTile skips its own query and just renders. */
  value: number | undefined;
  isLoading: boolean;
  endpoint?: never;
  queryKey?: never;
}

type StatTileProps = FetchingStatTileProps | PreFetchedStatTileProps;

interface CountEnvelope {
  data?: unknown[];
  meta?: { total?: number };
}

export function StatTile(props: StatTileProps) {
  if ("endpoint" in props && props.endpoint !== undefined) {
    return <FetchingStatTile {...props} />;
  }
  return <PreFetchedStatTile {...(props as PreFetchedStatTileProps)} />;
}

function FetchingStatTile({
  label,
  icon,
  href,
  subLine,
  endpoint,
  queryKey,
}: FetchingStatTileProps) {
  const joiner = endpoint.includes("?") ? "&" : "?";
  const url = `${endpoint}${joiner}limit=1`;

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey ?? ["stat-tile", endpoint],
    queryFn: () => apiClient<CountEnvelope>(url, { envelope: true }),
    staleTime: 30_000,
  });

  return renderTile({
    label,
    icon,
    href,
    subLine,
    isLoading,
    isError,
    value: data?.meta?.total ?? 0,
  });
}

function PreFetchedStatTile({
  label,
  icon,
  href,
  subLine,
  value,
  isLoading,
}: PreFetchedStatTileProps) {
  return renderTile({
    label,
    icon,
    href,
    subLine,
    isLoading,
    isError: false,
    value: value ?? 0,
  });
}

interface RenderArgs extends BaseStatTileProps {
  value: number;
  isLoading: boolean;
  isError: boolean;
}

function renderTile({
  label,
  icon: Icon,
  href,
  subLine,
  value,
  isLoading,
  isError,
}: RenderArgs) {
  const display = String(value);

  return (
    <Link href={href}>
      <Card className="card-hover h-full rounded-md border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5">
          <CardTitle className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground/70" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-7 w-14 animate-pulse rounded-sm bg-muted" />
          ) : isError ? (
            <p className="mono text-2xl font-semibold tabular-nums text-muted-foreground/60">
              —
            </p>
          ) : (
            <p className="mono text-2xl font-semibold tabular-nums text-foreground">
              {display}
            </p>
          )}
          {subLine && !isLoading && !isError ? (
            <div className="mt-1 text-[11px] text-muted-foreground">
              {subLine}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
