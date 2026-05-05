import { Skeleton } from "@tge/ui";

interface PageGridSkeletonProps {
  cardAspect?: "portrait" | "landscape" | "square";
  cardCount?: number;
  /** Show a placeholder for a page-level filter bar above the grid. */
  showFilterBar?: boolean;
  /**
   * Translated loading label for screen readers. Server-rendered — pass
   * from the page's own `getTranslations("LoadingPage")`.
   */
  label: string;
}

const aspectClass = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
} as const;

/**
 * Shared list-page loading skeleton: page header placeholders + card grid.
 * Used by cities / developers / agents / blog list pages so each gets a
 * tailored shape without re-implementing the boilerplate.
 */
export function PageGridSkeleton({
  cardAspect = "landscape",
  cardCount = 8,
  showFilterBar = false,
  label,
}: PageGridSkeletonProps) {
  return (
    <div
      className="bg-background min-h-[60vh] py-10"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-64 mb-3" />
        <Skeleton className="h-4 w-96 mb-8" />

        {showFilterBar ? <Skeleton className="h-14 w-full mb-8" /> : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: cardCount }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className={`${aspectClass[cardAspect]} w-full rounded-md`} />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>

        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
