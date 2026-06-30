'use client';

import { useState, useCallback, useMemo } from 'react';
import OrderRow from './OrderRow.js';
import AddOrderForm from './AddOrderForm.js';
import OrderFilters from './OrderFilters.js';
import ProductBoard from './ProductBoard.js';
import EditOrderModal from './EditOrderModal.js';
import { filterOrders, deriveOptions, DEFAULT_FILTERS } from '../lib/orderFilters.js';
import '../styles/order-list.css';

export default function OrderList({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [expandedOrderIds, setExpandedOrderIds] = useState(() => new Set());
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [filterState, setFilterState] = useState(DEFAULT_FILTERS);

  const countyOptions = useMemo(() => deriveOptions(orders, 'county'), [orders]);
  const platformOptions = useMemo(() => deriveOptions(orders, 'contactPlatform'), [orders]);
  const filteredOrders = useMemo(() => filterOrders(orders, filterState), [orders, filterState]);

  function handleFilterChange(key, value) {
    setFilterState((prev) => ({ ...prev, [key]: value }));
  }

  function handleFilterReset() {
    setFilterState(DEFAULT_FILTERS);
  }

  function handleToggle(orderId) {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
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
      setExpandedOrderIds((prev) => {
        if (!prev.has(orderId)) return prev;
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
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
      <OrderFilters
        filters={filterState}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        countyOptions={countyOptions}
        platformOptions={platformOptions}
      />
      {orders.length === 0 && (
        <p className="order-list-empty">Nu există comenzi. Adaugă prima comandă.</p>
      )}
      {orders.length > 0 && filteredOrders.length === 0 && (
        <p className="order-list-empty" role="status" data-testid="orders-empty">
          Nicio comandă găsită pentru filtrele selectate.
        </p>
      )}
      {filteredOrders.map((order) => (
        <div key={order.id} className="order-item">
          <OrderRow
            order={order}
            isExpanded={expandedOrderIds.has(order.id)}
            onToggle={handleToggle}
            onEdit={setEditingOrderId}
          />
          {expandedOrderIds.has(order.id) && (
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
          onDelete={handleDeleteOrder}
        />
      )}
    </div>
  );
}
