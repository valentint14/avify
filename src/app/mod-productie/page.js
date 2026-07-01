import { Suspense } from 'react';
import { getProductionQueue } from '../../lib/productionQueue.js';
import ProductionQueue from '../../components/ProductionQueue.js';
import ProductionQueueSkeleton from '@/components/skeletons/ProductionQueueSkeleton';

export const metadata = {
  title: 'Mod producție — Avify',
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<ProductionQueueSkeleton />}>
      <ProductionQueueData />
    </Suspense>
  );
}

async function ProductionQueueData() {
  await new Promise((resolve) => setImmediate(resolve));
  const groups    = getProductionQueue();
  const fetchedAt = new Date().toISOString();
  return <ProductionQueue initialGroups={groups} initialFetchedAt={fetchedAt} />;
}
