'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <form className="flex flex-wrap items-end gap-2" onSubmit={handleSubmit} noValidate>
      <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Nume material</label>
        <Input
          type="text"
          placeholder="ex. Carton"
          value={values.name}
          onChange={(e) => setField('name', e.target.value)}
          disabled={submitting}
          aria-label="Nume material"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Stoc actual</label>
        <Input
          className="max-w-[120px]"
          type="number"
          min="0"
          step="0.01"
          value={values.currentStock}
          onChange={(e) => setField('currentStock', e.target.value)}
          disabled={submitting}
          aria-label="Stoc actual"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Stoc minim</label>
        <Input
          className="max-w-[120px]"
          type="number"
          min="0"
          step="0.01"
          value={values.minStock}
          onChange={(e) => setField('minStock', e.target.value)}
          disabled={submitting}
          aria-label="Stoc minim"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Unitate</label>
        <Input
          className="max-w-[120px]"
          type="text"
          placeholder="foi, m, g"
          value={values.unit}
          onChange={(e) => setField('unit', e.target.value)}
          disabled={submitting}
          aria-label="Unitate de măsură"
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Se salvează…' : submitLabel}
      </Button>
      {onCancel && (
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Anulează
        </Button>
      )}
      {error && <span className="w-full text-sm text-destructive">{error}</span>}
    </form>
  );
}
