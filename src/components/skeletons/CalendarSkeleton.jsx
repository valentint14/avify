import { Skeleton } from '@/components/ui/skeleton';

export default function CalendarSkeleton() {
  return (
    <div
      role="status"
      aria-label="Se încarcă…"
      className="mx-auto max-w-6xl p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded" />
          <Skeleton className="h-9 w-16 rounded" />
          <Skeleton className="h-9 w-28 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-6 rounded" />
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded" />
        ))}
      </div>
    </div>
  );
}
