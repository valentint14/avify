'use client';

import { useState } from 'react';
import OrderCard from './OrderCard.js';

export default function Column({ stageName, stageId, orders, onCardClick, onMoveOrder }) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const orderId = e.dataTransfer.getData('orderId');
    if (orderId) onMoveOrder(orderId, stageId);
  }

  return (
    <div
      className={`column${isDragOver ? ' drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <span className="column-title">{stageName}</span>
        <span className="column-count">{orders.length}</span>
      </div>
      <div className="column-cards">
        {orders.length === 0 && <p className="column-empty">Nicio comandă</p>}
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onClick={onCardClick}
            onMoveOrder={onMoveOrder}
          />
        ))}
      </div>
    </div>
  );
}
