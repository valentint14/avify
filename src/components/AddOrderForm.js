'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <form className="mb-2 flex flex-wrap items-center gap-2" onSubmit={handleSubmit} noValidate>
      <Input
        className="min-w-[200px] flex-1"
        data-testid="add-order-input"
        type="text"
        placeholder="Numele comenzii…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        aria-label="Numele comenzii"
      />
      <Button type="submit" disabled={submitting} data-testid="add-order-submit" className="shrink-0">
        {submitting ? 'Se adaugă…' : 'Adaugă comandă'}
      </Button>
      {error && (
        <span className="w-full text-sm text-destructive" data-testid="add-order-error">
          {error}
        </span>
      )}
    </form>
  );
}
