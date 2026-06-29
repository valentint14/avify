'use client';

import '../styles/order-list.css';

export default function OrderRow({ order, isExpanded, onToggle, onEdit }) {
  const statusLabel = order.status === 'finalizata' ? 'Finalizată' : 'În progres';
  const statusClass = `status-badge status-badge--${order.status}`;

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
          <div className="order-row-badges">
            <span className={`order-row-badge${order.collected ? ' order-row-badge--active' : ''}`}>
              Încasată
            </span>
            <span className={`order-row-badge${order.delivered ? ' order-row-badge--active' : ''}`}>
              Livrată
            </span>
          </div>
        </div>

        <div className="order-row-actions">
          <span className="order-row-total">
            <span className="order-row-total-label">Total: </span>
            {Number(order.total ?? 0).toFixed(2)} RON
          </span>
          <span className="order-row-profit">
            <span className="order-row-profit-label">Profit: </span>
            {Number(order.profit ?? 0).toFixed(2)} RON
          </span>
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
        </div>
      </div>
    </div>
  );
}
