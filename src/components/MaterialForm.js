'use client';

import { useState } from 'react';

const EMPTY = { name: '', currentStock: '', minStock: '', unit: '' };

export default function MaterialForm({ initialValues, onSave, onCancel, submitLabel = 'Adaugă' }) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function setField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const name = values.name.trim();
    if (!name) {
      setError('Numele materialului este obligatoriu.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSave({
        name,
        currentStock: values.currentStock === '' ? 0 : Number(values.currentStock),
        minStock: values.minStock === '' ? 0 : Number(values.minStock),
        unit: values.unit.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="material-form" onSubmit={handleSubmit} noValidate>
      <div className="material-form-field material-form-field--name">
        <label className="material-form-label">Nume material</label>
        <input
          className="material-form-input"
          type="text"
          placeholder="ex. Carton"
          value={values.name}
          onChange={(e) => setField('name', e.target.value)}
          disabled={submitting}
          aria-label="Nume material"
        />
      </div>
      <div className="material-form-field">
        <label className="material-form-label">Stoc actual</label>
        <input
          className="material-form-input material-form-input--num"
          type="number"
          min="0"
          step="0.01"
          value={values.currentStock}
          onChange={(e) => setField('currentStock', e.target.value)}
          disabled={submitting}
          aria-label="Stoc actual"
        />
      </div>
      <div className="material-form-field">
        <label className="material-form-label">Stoc minim</label>
        <input
          className="material-form-input material-form-input--num"
          type="number"
          min="0"
          step="0.01"
          value={values.minStock}
          onChange={(e) => setField('minStock', e.target.value)}
          disabled={submitting}
          aria-label="Stoc minim"
        />
      </div>
      <div className="material-form-field">
        <label className="material-form-label">Unitate</label>
        <input
          className="material-form-input material-form-input--num"
          type="text"
          placeholder="foi, m, g"
          value={values.unit}
          onChange={(e) => setField('unit', e.target.value)}
          disabled={submitting}
          aria-label="Unitate de măsură"
        />
      </div>
      <button className="material-form-btn" type="submit" disabled={submitting}>
        {submitting ? 'Se salvează…' : submitLabel}
      </button>
      {onCancel && (
        <button
          className="material-form-btn material-form-btn--secondary"
          type="button"
          onClick={onCancel}
          disabled={submitting}
        >
          Anulează
        </button>
      )}
      {error && <span className="material-form-error">{error}</span>}
    </form>
  );
}
