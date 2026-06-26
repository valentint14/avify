'use client';

import '../styles/order-list.css';

export default function OrderRow({ order, isExpanded, onToggle, onDelete, onEdit }) {
  const statusLabel = order.status === 'finalizata' ? 'Finalizată' : 'În progres';
  const statusClass = `status-badge status-badge--${order.status}`;

  function handleDeleteClick(e) {
    e.stopPropagation();
    if (window.confirm(`Ștergi comanda "${order.name}"? Toate produsele vor fi șterse.`)) {
      onDelete(order.id);
    }
  }

  return (
    <div
      className={`order-row${isExpanded ? ' order-row--expanded' : ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={() => onToggle(order.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(order.id);
        }
      }}
    >
      <div className="order-row-header">
        <span className="order-row-chevron">{isExpanded ? '▼' : '▶'}</span>

        <div className="order-row-identity">
          <span className="order-row-name">{order.name}</span>
          <span className={statusClass}>{statusLabel}</span>
        </div>

        <div className="order-row-actions">
          <span className="product-summary">
            {order.doneCount} / {order.productCount} gata
          </span>
          <button
            className="order-row-edit"
            aria-label={`Editează produsele din comanda ${order.name}`}
            onClick={(e) => { e.stopPropagation(); onEdit(order.id); }}
          >
            Editează
          </button>
          <button
            className="order-row-delete"
            aria-label={`Șterge comanda ${order.name}`}
            onClick={handleDeleteClick}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
