import { getAllWithStatus } from '../lib/orders.js';
import OrderList from '../components/OrderList.js';

// Always render fresh on the server so the orders list reflects the current
// state on navigation (e.g. after edits made elsewhere) — no stale seed.
export const dynamic = 'force-dynamic';

export default function Page() {
  const initialOrders = getAllWithStatus();
  return <OrderList initialOrders={initialOrders} />;
}
