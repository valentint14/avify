'use client';

import { useState, useCallback } from 'react';
import Column from './Column.js';
import OrderForm from './OrderForm.js';
import FilterBar from './FilterBar.js';
import { STAGES } from '../lib/constants.js';

export default function Board({ initialOrders, initialProductTypes }) {
  const [orders, setOrders] = useState(initialOrders);
  const [productTypes] = useState(initialProductTypes);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filters, setFilters] = useState({ paymentStatus: '', eventDateFrom: '', eventDateTo: '' });

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    setOrders(data.orders);
  }, []);

  function openForm(order = null) {
    setSelectedOrder(order);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setSelectedOrder(null);
  }

  async function handleSave(formData) {
    if (selectedOrder) {
      await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } else {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    }
    await fetchOrders();
    closeForm();
  }

  async function handleDelete(id) {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    await fetchOrders();
    closeForm();
  }

  async function handleMoveOrder(orderId, newStage) {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    });
    await fetchOrders();
  }

  const filteredOrders = orders.filter((o) => {
    if (filters.paymentStatus && o.paymentStatus !== filters.paymentStatus) return false;
    if (filters.eventDateFrom && o.eventDate < filters.eventDateFrom) return false;
    if (filters.eventDateTo && o.eventDate > filters.eventDateTo) return false;
    return true;
  });

  return (
    <div className="board">
      <div className="board-header">
        <span className="board-title">Avify — Comenzi Papetărie</span>
        <button className="btn-new-order" onClick={() => openForm(null)}>
          + Comandă nouă
        </button>
      </div>

      <div className="board-filters">
        <FilterBar onFilterChange={setFilters} />
      </div>

      <div className="board-columns">
        {STAGES.map((stage) => (
          <Column
            key={stage.id}
            stageName={stage.label}
            stageId={stage.id}
            orders={filteredOrders.filter((o) => o.stage === stage.id)}
            onCardClick={openForm}
            onMoveOrder={handleMoveOrder}
          />
        ))}
      </div>

      {isFormOpen && (
        <OrderForm
          order={selectedOrder}
          productTypesList={productTypes}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
