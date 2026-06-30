'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <form className="flex flex-col gap-2" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="min-w-[200px] flex-1"
          type="text"
          placeholder="Denumire produs *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          aria-label="Denumire produs"
          autoFocus
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Se salvează…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Anulează
          </Button>
        )}
      </div>
      <Input
        type="text"
        placeholder="Descriere (opțional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={submitting}
        aria-label="Descriere produs"
      />
      {error && <span className="text-sm text-destructive">{error}</span>}
    </form>
  );
}
