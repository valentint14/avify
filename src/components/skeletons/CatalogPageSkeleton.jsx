import { Skeleton } from '@/components/ui/skeleton';

export default function CatalogPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Se încarcă…"
      className="mx-auto flex max-w-4xl flex-col gap-4 p-6"
    >
      {/* Page heading */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Add-form card */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Catalog item rows */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-card shadow-sm"
          >
            <div className="flex items-center gap-4 p-3">
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex shrink-0 gap-1">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
