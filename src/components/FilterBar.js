'use client';

import { useState } from 'react';
import { VALID_PAYMENT, PAYMENT_LABELS } from '../lib/constants.js';

export default function FilterBar({ onFilterChange }) {
  const [paymentStatus, setPaymentStatus] = useState('');
  const [eventDateFrom, setEventDateFrom] = useState('');
  const [eventDateTo, setEventDateTo] = useState('');

  function update(ps, from, to) {
    setPaymentStatus(ps);
    setEventDateFrom(from);
    setEventDateTo(to);
    onFilterChange({ paymentStatus: ps, eventDateFrom: from, eventDateTo: to });
  }

  function setNext30Days() {
    const today = new Date();
    const plus30 = new Date(today);
    plus30.setDate(today.getDate() + 30);
    const fmt = (d) => d.toISOString().slice(0, 10);
    update(paymentStatus, fmt(today), fmt(plus30));
  }

  function clearAll() {
    update('', '', '');
  }

  return (
    <div className="filter-bar" role="search" aria-label="Filtrare comenzi">
      <div className="filter-field">
        <label className="filter-label" htmlFor="filter-payment">
          Status plată
        </label>
        <select
          id="filter-payment"
          className="form-select"
          style={{ width: '180px' }}
          value={paymentStatus}
          onChange={(e) => update(e.target.value, eventDateFrom, eventDateTo)}
        >
          <option value="">Toate</option>
          {VALID_PAYMENT.map((v) => (
            <option key={v} value={v}>
              {PAYMENT_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label className="filter-label" htmlFor="filter-date-from">
          De la data
        </label>
        <input
          id="filter-date-from"
          className="form-input"
          type="date"
          style={{ width: '160px' }}
          value={eventDateFrom}
          onChange={(e) => update(paymentStatus, e.target.value, eventDateTo)}
        />
      </div>

      <div className="filter-field">
        <label className="filter-label" htmlFor="filter-date-to">
          Până la data
        </label>
        <input
          id="filter-date-to"
          className="form-input"
          type="date"
          style={{ width: '160px' }}
          value={eventDateTo}
          onChange={(e) => update(paymentStatus, eventDateFrom, e.target.value)}
        />
      </div>

      <div className="filter-shortcuts">
        <button className="btn-filter" onClick={setNext30Days}>
          Următoarele 30 de zile
        </button>
        {(paymentStatus || eventDateFrom || eventDateTo) && (
          <button className="btn-filter btn-filter-clear" onClick={clearAll}>
            Șterge filtre
          </button>
        )}
      </div>
    </div>
  );
}
