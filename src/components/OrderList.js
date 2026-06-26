'use client';

import { useState, useCallback } from 'react';
import OrderRow from './OrderRow.js';
import AddOrderForm from './AddOrderForm.js';
import ProductBoard from './ProductBoard.js';
import EditOrderModal from './EditOrderModal.js';
import '../styles/order-list.css';

export default function OrderList({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);

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

  const handleEditSaved = useCallback(async () => {
    setBoardRefreshKey((k) => k + 1);
    await handleProductChange();
  }, [handleProductChange]);

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
            onEdit={setEditingOrderId}
          />
          {expandedOrderId === order.id && (
            <ProductBoard
              orderId={order.id}
              onProductChange={handleProductChange}
              refreshKey={boardRefreshKey}
            />
          )}
        </div>
      ))}
      {editingOrderId && (
        <EditOrderModal
          orderId={editingOrderId}
          onClose={() => setEditingOrderId(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}
