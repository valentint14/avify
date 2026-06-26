'use client';

import { useState } from 'react';
import '../styles/form.css';

export default function AddProductForm({ orderId, onProductAdded }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Numele produsului este obligatoriu.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Eroare la adăugarea produsului.');
      } else {
        setName('');
        onProductAdded(data.product);
      }
    } catch {
      setError('Eroare la adăugarea produsului.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-form add-product-form" onSubmit={handleSubmit} noValidate>
      <input
        className="add-form-input"
        type="text"
        placeholder="Numele produsului…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        aria-label="Numele produsului"
      />
      <button className="add-form-btn" type="submit" disabled={submitting}>
        {submitting ? 'Se adaugă…' : 'Adaugă produs'}
      </button>
      {error && <span className="add-form-error">{error}</span>}
    </form>
  );
}
