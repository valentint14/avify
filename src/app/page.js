import { getAll, getAllProductTypes } from '../lib/orders.js';
import Board from '../components/Board.js';

export default function Page() {
  const initialOrders = getAll();
  const initialProductTypes = getAllProductTypes();
  return <Board initialOrders={initialOrders} initialProductTypes={initialProductTypes} />;
}
