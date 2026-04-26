import { Skeleton } from "@tge/ui";

/**
 * Per-page loading skeletons. Mirrors the visual structure of each page so
 * the transition from skeleton → real content doesn't cause layout shift.
 * Rendered by Next.js `loading.tsx` files (on initial navigation) and by
 * pages themselves while React Query is fetching.
 */

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12" aria-busy="true">
      <header className="mb-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-8 w-64" />
      </header>
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-[color:var(--color-border)] p-6"
          >
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-5 h-1.5 w-full" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12" aria-busy="true">
      <header className="mb-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </header>
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-[color:var(--color-border)] p-6"
          >
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-5 h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourseSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-6 h-9 w-3/5" />
      <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
      <Skeleton className="mt-2 h-5 w-3/4" />
      <div className="mt-6 flex flex-wrap gap-3">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <Skeleton className="mt-10 h-6 w-32" />
      <div className="mt-4 divide-y divide-[color:var(--color-border)] rounded-lg border border-[color:var(--color-border)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LessonSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8" aria-busy="true">
      <Skeleton className="h-4 w-72" />
      <div className="mt-6 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="mt-6 h-3 w-20" />
      <Skeleton className="mt-3 h-9 w-4/5" />
      <div className="mt-10 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
      </div>
      <div className="mt-10 flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-6">
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8" aria-busy="true">
      <Skeleton className="h-7 w-40" />
      {Array.from({ length: 2 }).map((_, i) => (
        <section
          key={i}
          className="mt-8 rounded-lg border border-[color:var(--color-border)] bg-white p-5"
        >
          <Skeleton className="h-3 w-24" />
          <div className="mt-4 flex flex-col gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </section>
      ))}
    </div>
  );
}
