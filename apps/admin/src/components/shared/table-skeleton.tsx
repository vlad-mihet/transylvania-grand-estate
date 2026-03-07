import { Skeleton } from "@tge/ui";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="rounded-xl border border-copper/[0.08] overflow-hidden">
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
  );
}
