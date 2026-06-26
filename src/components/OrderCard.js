'use client';

import { PAYMENT_LABELS, EVENT_LABELS, STAGES } from '../lib/constants.js';

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export default function OrderCard({ order, onClick, onMoveOrder }) {
  function handleDragStart(e) {
    e.dataTransfer.setData('orderId', order.id);
    e.currentTarget.classList.add('is-dragging');
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove('is-dragging');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(order);
    }
  }

  const paymentClass = {
    neachitat: 'badge-neachitat',
    avans_achitat: 'badge-avans-achitat',
    achitat_integral: 'badge-achitat-integral',
  }[order.paymentStatus];

  const eventClass = order.eventType === 'nunta' ? 'badge-nunta' : 'badge-botez';

  return (
    <div
      className="card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick(order)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Comandă ${order.primaryName}${order.secondaryName ? ' / ' + order.secondaryName : ''}`}
    >
      <div className="card-names">
        <div className="card-primary">{order.primaryName}</div>
        {order.secondaryName && <div className="card-secondary">{order.secondaryName}</div>}
      </div>
      <div className="card-date">{formatDate(order.eventDate)}</div>
      <div className="card-badges">
        <span className={`badge ${eventClass}`}>{EVENT_LABELS[order.eventType]}</span>
        <span className={`badge ${paymentClass}`}>{PAYMENT_LABELS[order.paymentStatus]}</span>
      </div>

      {onMoveOrder && (
        <select
          className="form-select"
          style={{ marginTop: '8px', fontSize: '0.75rem' }}
          value={order.stage}
          aria-label="Mută în etapa"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onMoveOrder(order.id, e.target.value)}
        >
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
