import { Skeleton } from "@tge/ui";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <>
      {/* Mobile card skeletons */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: Math.min(rows, 3) }).map((_, i) => (
          <div key={i} className="rounded-xl border border-copper/[0.08] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-copper/[0.06]">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden md:block rounded-xl border border-copper/[0.08] overflow-hidden">
        <div className="flex gap-4 border-b border-copper/[0.08] bg-[rgba(196,127,90,0.03)] px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1 rounded" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex items-center gap-4 border-b border-copper/[0.08] last:border-b-0 px-4 py-3.5"
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={`h-4 rounded ${colIdx === 0 ? "w-16" : "flex-1"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
