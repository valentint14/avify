'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

let keySeq = 0;

export default function AddProductForm({ orderId, onProductAdded, excludedTemplateIds = [] }) {
  const [templates, setTemplates] = useState([]);
  const [items, setItems] = useState([]); // { key, name, templateId|null, quantity, additionalInfo }
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(({ templates: list }) => setTemplates(list ?? []))
      .catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const excluded = new Set([
    ...excludedTemplateIds,
    ...items.filter((i) => i.templateId).map((i) => i.templateId),
  ]);
  const trimmed = query.trim();
  const filtered = templates.filter(
    (t) => !excluded.has(t.id) && t.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  // Allow an ad-hoc product when the query doesn't exactly match a catalog name.
  const hasExactMatch = templates.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  const canAddAdhoc = trimmed !== '' && !hasExactMatch;

  function addItem(item) {
    keySeq += 1;
    setItems((prev) => [...prev, { key: keySeq, quantity: 1, additionalInfo: '', ...item }]);
    setQuery('');
    setOpen(false);
    setError('');
  }
  function addTemplate(t) {
    addItem({ name: t.name, templateId: t.id });
  }
  function addAdhoc() {
    if (trimmed === '') return;
    addItem({ name: trimmed, templateId: null });
  }
  function removeItem(key) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }
  function setItemField(key, field, value) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (items.length === 0) {
      setError('Selectează sau scrie cel puțin un produs.');
      return;
    }
    for (const it of items) {
      const qty = Number(it.quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        setError(`Cantitatea pentru "${it.name}" trebuie să fie un număr întreg pozitiv.`);
        return;
      }
    }

    setError('');
    setSubmitting(true);
    try {
      for (const it of items) {
        const body = {
          orderId,
          name: it.name,
          quantity: Math.trunc(Number(it.quantity)),
          additionalInfo: it.additionalInfo.trim() || null,
        };
        if (it.templateId) body.templateId = it.templateId;
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Eroare la adăugarea produsului.');
          return;
        }
        onProductAdded(data.product);
      }
      setItems([]);
    } catch {
      setError('Eroare la adăugarea produsului.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-2 flex flex-col gap-3" data-testid="add-product-form" onSubmit={handleSubmit} noValidate>
      <div className="flex items-start gap-2">
        <div ref={containerRef} className="relative flex-1">
          <Input
            data-testid="product-search"
            placeholder="🔍 Caută din catalog sau scrie un produs…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            aria-label="Caută sau scrie un produs"
            autoComplete="off"
          />
          {open && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
              {filtered.length > 0 && (
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Din catalog</p>
              )}
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-testid="catalog-option"
                  className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => addTemplate(t)}
                >
                  {t.name}
                </button>
              ))}
              {canAddAdhoc && (
                <button
                  type="button"
                  data-testid="add-adhoc-option"
                  className="mt-1 block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={addAdhoc}
                >
                  + Adaugă „{trimmed}” ca produs nou
                </button>
              )}
              {filtered.length === 0 && !canAddAdhoc && (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  Scrie un nume pentru a adăuga un produs.
                </p>
              )}
            </div>
          )}
        </div>

        <Button type="submit" disabled={submitting} data-testid="add-product-submit" className="shrink-0">
          {submitting ? 'Se adaugă…' : 'Adaugă produs'}
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div key={it.key} className="rounded-md border border-border p-2" data-testid="add-product-item">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {it.name}
                  {!it.templateId && <span className="ml-1 text-xs text-muted-foreground">(nou)</span>}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded px-1 leading-none text-muted-foreground hover:text-destructive"
                  aria-label={`Elimină ${it.name}`}
                  onClick={() => removeItem(it.key)}
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor={`qty-${it.key}`}>Cantitate</label>
                  <Input id={`qty-${it.key}`} type="number" min="1" value={it.quantity} onChange={(e) => setItemField(it.key, 'quantity', e.target.value)} disabled={submitting} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor={`info-${it.key}`}>Informații suplimentare</label>
                  <Textarea id={`info-${it.key}`} rows={2} value={it.additionalInfo} onChange={(e) => setItemField(it.key, 'additionalInfo', e.target.value)} disabled={submitting} placeholder="Note personalizare, culori, font…" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <span className="text-sm text-destructive" data-testid="add-product-error">{error}</span>}
    </form>
  );
}
