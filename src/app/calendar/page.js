import { Suspense } from 'react';
import CalendarSkeleton from '@/components/skeletons/CalendarSkeleton';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import { getAllWithStatus } from '@/lib/orders';

export const metadata = { title: 'Calendar — Avify' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarData />
    </Suspense>
  );
}

async function CalendarData() {
  await new Promise((resolve) => setImmediate(resolve));
  const orders = getAllWithStatus();
  return <CalendarGrid orders={orders} />;
}
