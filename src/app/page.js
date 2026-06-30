import { Suspense } from 'react';
import { getAllWithStatus } from '../lib/orders.js';
import OrderList from '../components/OrderList.js';
import OrdersListSkeleton from '@/components/skeletons/OrdersListSkeleton';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<OrdersListSkeleton />}>
      <OrdersData />
    </Suspense>
  );
}

async function OrdersData() {
  await new Promise((resolve) => setImmediate(resolve));
  const initialOrders = getAllWithStatus();
  return <OrderList initialOrders={initialOrders} />;
}
