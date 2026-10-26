import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
      role="status"
      aria-label="Loading page"
    >
      <span className="sr-only">Loading page…</span>
      <Skeleton className="h-8 w-48 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
