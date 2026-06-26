'use client';

import { useState } from 'react';
import '../styles/catalog.css';

export default function CatalogProductForm({ initialName = '', initialDescription = '', onSave, onCancel, submitLabel = 'Salvează' }) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Denumirea produsului este obligatorie.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSave({ name: trimmedName, description: description.trim() || null });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="catalog-form" onSubmit={handleSubmit} noValidate>
      <div className="catalog-form-row">
        <input
          className="catalog-form-input"
          type="text"
          placeholder="Denumire produs *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          aria-label="Denumire produs"
          autoFocus
        />
        <button className="catalog-form-btn" type="submit" disabled={submitting}>
          {submitting ? 'Se salvează…' : submitLabel}
        </button>
        {onCancel && (
          <button
            className="catalog-form-btn catalog-form-btn--secondary"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            Anulează
          </button>
        )}
      </div>
      <input
        className="catalog-form-desc"
        type="text"
        placeholder="Descriere (opțional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={submitting}
        aria-label="Descriere produs"
      />
      {error && <span className="catalog-form-error">{error}</span>}
    </form>
  );
}
