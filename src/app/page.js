import { getAllWithStatus } from '../lib/orders.js';
import OrderList from '../components/OrderList.js';

export default function Page() {
  const initialOrders = getAllWithStatus();
  return <OrderList initialOrders={initialOrders} />;
}
