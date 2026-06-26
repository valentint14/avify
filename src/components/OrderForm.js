'use client';

import { useState, useEffect, useRef } from 'react';
import { VALID_EVENTS, EVENT_LABELS, VALID_PAYMENT, PAYMENT_LABELS } from '../lib/constants.js';

const EMPTY_FORM = {
  primaryName: '',
  secondaryName: '',
  eventDate: '',
  eventType: 'nunta',
  productTypes: [],
  paymentStatus: 'neachitat',
  notes: '',
};

function toFormValues(order) {
  if (!order) return EMPTY_FORM;
  return {
    primaryName: order.primaryName || '',
    secondaryName: order.secondaryName || '',
    eventDate: order.eventDate || '',
    eventType: order.eventType || 'nunta',
    productTypes: order.productTypes ? [...order.productTypes] : [],
    paymentStatus: order.paymentStatus || 'neachitat',
    notes: order.notes || '',
  };
}

export default function OrderForm({ order, productTypesList, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => toFormValues(order));
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    setForm(toFormValues(order));
    setIsDirty(false);
    firstInputRef.current?.focus();
  }, [order]);

  function patch(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  function toggleProduct(name) {
    setForm((prev) => {
      const exists = prev.productTypes.includes(name);
      return {
        ...prev,
        productTypes: exists ? prev.productTypes.filter((p) => p !== name) : [...prev.productTypes, name],
      };
    });
    setIsDirty(true);
  }

  function requestClose() {
    if (isDirty) {
      if (!window.confirm('Ai modificări nesalvate. Sigur vrei să închizi?')) return;
    }
    onClose();
  }

  async function handleSave() {
    if (!form.primaryName.trim()) {
      alert('Numele clientului este obligatoriu.');
      return;
    }
    if (!form.eventDate) {
      alert('Data evenimentului este obligatorie.');
      return;
    }
    if (form.productTypes.length === 0) {
      alert('Selectează cel puțin un tip de produs.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, primaryName: form.primaryName.trim(), secondaryName: form.secondaryName.trim() || null, notes: form.notes.trim() || null });
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Sigur vrei să ștergi această comandă? Acțiunea este permanentă.')) return;
    await onDelete(order.id);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) requestClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') requestClose();
  }

  const isEdit = Boolean(order);

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal">
        <div className="modal-header">
          <span id="modal-title" className="modal-title">
            {isEdit ? 'Editează comanda' : 'Comandă nouă'}
          </span>
          <button className="modal-close" onClick={requestClose} aria-label="Închide">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label className="form-label required" htmlFor="primaryName">
              Nume client
            </label>
            <input
              id="primaryName"
              ref={firstInputRef}
              className="form-input"
              type="text"
              value={form.primaryName}
              maxLength={100}
              onChange={(e) => patch('primaryName', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="secondaryName">
              Partener (opțional)
            </label>
            <input
              id="secondaryName"
              className="form-input"
              type="text"
              value={form.secondaryName}
              maxLength={100}
              onChange={(e) => patch('secondaryName', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label required" htmlFor="eventDate">
              Dată eveniment
            </label>
            <input
              id="eventDate"
              className="form-input"
              type="date"
              value={form.eventDate}
              onChange={(e) => patch('eventDate', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label required" htmlFor="eventType">
              Tip eveniment
            </label>
            <select
              id="eventType"
              className="form-select"
              value={form.eventType}
              onChange={(e) => patch('eventType', e.target.value)}
            >
              {VALID_EVENTS.map((v) => (
                <option key={v} value={v}>
                  {EVENT_LABELS[v]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <span className="form-label required">Tipuri de produse</span>
            <div className="form-checkboxes">
              {productTypesList.map((pt) => (
                <label key={pt.id} className="form-checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.productTypes.includes(pt.name)}
                    onChange={() => toggleProduct(pt.name)}
                  />
                  {pt.name}
                </label>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label required" htmlFor="paymentStatus">
              Status plată
            </label>
            <select
              id="paymentStatus"
              className="form-select"
              value={form.paymentStatus}
              onChange={(e) => patch('paymentStatus', e.target.value)}
            >
              {VALID_PAYMENT.map((v) => (
                <option key={v} value={v}>
                  {PAYMENT_LABELS[v]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="notes">
              Notițe (opțional)
            </label>
            <textarea
              id="notes"
              className="form-textarea"
              value={form.notes}
              maxLength={1000}
              onChange={(e) => patch('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="modal-actions">
          {isEdit && (
            <div className="modal-actions-left">
              <button className="btn btn-danger" onClick={handleDelete}>
                Șterge
              </button>
            </div>
          )}
          <button className="btn btn-secondary" onClick={requestClose}>
            Anulează
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Se salvează…' : 'Salvează'}
          </button>
        </div>
      </div>
    </div>
  );
}
