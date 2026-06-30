import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Se încarcă…"
      className="mx-auto flex max-w-6xl flex-col gap-2 p-6"
    >
      {/* Filter bar */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Order card rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
        >
          <Skeleton className="h-3 w-3.5 shrink-0" />
          <Skeleton className="h-4 max-w-xs flex-1" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="ml-auto h-8 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}
