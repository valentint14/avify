'use client';

import { useState } from 'react';
import '../styles/form.css';

export default function AddOrderForm({ onOrderAdded }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Numele comenzii este obligatoriu.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Eroare la crearea comenzii.');
      } else {
        setName('');
        onOrderAdded(data.order);
      }
    } catch {
      setError('Eroare la crearea comenzii.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit} noValidate>
      <input
        className="add-form-input"
        type="text"
        placeholder="Numele comenzii…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        aria-label="Numele comenzii"
      />
      <button className="add-form-btn" type="submit" disabled={submitting}>
        {submitting ? 'Se adaugă…' : 'Adaugă comandă'}
      </button>
      {error && <span className="add-form-error">{error}</span>}
    </form>
  );
}
