'use client';

import { useState, useCallback } from 'react';
import OrderRow from './OrderRow.js';
import AddOrderForm from './AddOrderForm.js';
import ProductBoard from './ProductBoard.js';
import '../styles/order-list.css';

export default function OrderList({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  function handleToggle(orderId) {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  }

  async function handleOrderAdded(newOrder) {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const { orders: fresh } = await res.json();
      setOrders(fresh);
    } else {
      setOrders((prev) => [newOrder, ...prev]);
    }
  }

  async function handleDeleteOrder(orderId) {
    const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (expandedOrderId === orderId) setExpandedOrderId(null);
    }
  }

  const handleProductChange = useCallback(async () => {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const { orders: fresh } = await res.json();
      setOrders(fresh);
    }
  }, []);

  return (
    <div className="order-list">
      <AddOrderForm onOrderAdded={handleOrderAdded} />
      {orders.length === 0 && (
        <p className="order-list-empty">Nu există comenzi. Adaugă prima comandă.</p>
      )}
      {orders.map((order) => (
        <div key={order.id} className="order-item">
          <OrderRow
            order={order}
            isExpanded={expandedOrderId === order.id}
            onToggle={handleToggle}
            onDelete={handleDeleteOrder}
          />
          {expandedOrderId === order.id && (
            <ProductBoard
              orderId={order.id}
              onProductChange={handleProductChange}
            />
          )}
        </div>
      ))}
    </div>
  );
}
