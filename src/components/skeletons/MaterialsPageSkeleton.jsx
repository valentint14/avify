import { Skeleton } from '@/components/ui/skeleton';

export default function MaterialsPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Se încarcă…"
      className="mx-auto flex max-w-4xl flex-col gap-4 p-6"
    >
      {/* Page heading */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Add-form card */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <Skeleton className="mb-3 h-5 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Material rows */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-md border border-border bg-card p-3 shadow-sm"
          >
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-10" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
