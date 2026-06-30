import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Se încarcă…"
      className="mx-auto flex max-w-6xl flex-col gap-6 p-6"
    >
      {/* KPI cards row */}
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      {/* Monthly profit chart */}
      <Skeleton className="h-72 w-full rounded-lg" />

      {/* Top products chart */}
      <Skeleton className="h-56 w-full rounded-lg" />
    </div>
  );
}
