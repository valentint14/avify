'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

let keySeq = 0;

function CatalogPickerModal({ open, onClose, templates, excludedIds, onConfirm }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(new Set());
    }
  }, [open]);

  const filtered = templates.filter(
    (t) =>
      !excludedIds.has(t.id) &&
      t.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(templates.filter((t) => selected.has(t.id)));
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>Selectează din catalog</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3">
          <Input
            placeholder="Caută produs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            data-testid="catalog-picker-search"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {query.trim() ? 'Niciun rezultat.' : 'Catalogul este gol.'}
            </p>
          )}
          {filtered.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-accent"
              data-testid="catalog-picker-item"
            >
              <Checkbox
                checked={selected.has(t.id)}
                onCheckedChange={() => toggle(t.id)}
              />
              <span className="flex-1 text-sm">{t.name}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2 border-t border-border px-4 py-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Anulează
          </Button>
          <Button
            className="flex-1"
            disabled={selected.size === 0}
            onClick={handleConfirm}
            data-testid="catalog-picker-confirm"
          >
            {selected.size > 0 ? `Adaugă (${selected.size})` : 'Adaugă'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AddProductForm({ orderId, onProductAdded, excludedTemplateIds = [] }) {
  const [templates, setTemplates] = useState([]);
  const [items, setItems] = useState([]);
  const [adhocName, setAdhocName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(({ templates: list }) => setTemplates(list ?? []))
      .catch(() => setTemplates([]));
  }, []);

  const excludedIds = new Set([
    ...excludedTemplateIds,
    ...items.filter((i) => i.templateId).map((i) => i.templateId),
  ]);

  function addFromCatalog(picks) {
    setItems((prev) => [
      ...prev,
      ...picks.map((t) => {
        keySeq += 1;
        return { key: keySeq, name: t.name, templateId: t.id, quantity: 1, unitPrice: '', additionalInfo: '' };
      }),
    ]);
    setError('');
  }

  function addAdhoc() {
    const name = adhocName.trim();
    if (!name) return;
    keySeq += 1;
    setItems((prev) => [...prev, { key: keySeq, name, templateId: null, quantity: 1, unitPrice: '', additionalInfo: '' }]);
    setAdhocName('');
    setError('');
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
        const parsedPrice = it.unitPrice !== '' ? Number(it.unitPrice) : null;
        const body = {
          orderId,
          name: it.name,
          quantity: Math.trunc(Number(it.quantity)),
          additionalInfo: it.additionalInfo.trim() || null,
          ...(parsedPrice !== null && Number.isFinite(parsedPrice) && parsedPrice >= 0
            ? { unitPrice: parsedPrice }
            : {}),
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
    <>
      <CatalogPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        templates={templates}
        excludedIds={excludedIds}
        onConfirm={addFromCatalog}
      />

      <form className="mt-2 flex flex-col gap-3" data-testid="add-product-form" onSubmit={handleSubmit} noValidate>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            data-testid="open-catalog-picker"
          >
            Din catalog
          </Button>
          <Input
            placeholder="Sau scrie un produs ad-hoc…"
            value={adhocName}
            onChange={(e) => setAdhocName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addAdhoc(); }
            }}
            data-testid="product-adhoc-input"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addAdhoc}
            disabled={!adhocName.trim()}
            aria-label="Adaugă produs ad-hoc"
          >
            +
          </Button>
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-2">
            {items.map((it) => (
              <div key={it.key} className="rounded-md border border-border p-2" data-testid="add-product-item">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {it.name}
                    {!it.templateId && (
                      <span className="ml-1 text-xs text-muted-foreground">(nou)</span>
                    )}
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground" htmlFor={`qty-${it.key}`}>
                      Cantitate
                    </label>
                    <Input
                      id={`qty-${it.key}`}
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => setItemField(it.key, 'quantity', e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground" htmlFor={`price-${it.key}`}>
                      Preț/buc (RON)
                    </label>
                    <Input
                      id={`price-${it.key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={it.unitPrice}
                      onChange={(e) => setItemField(it.key, 'unitPrice', e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-1">
                    <label className="text-xs text-muted-foreground" htmlFor={`info-${it.key}`}>
                      Informații suplimentare
                    </label>
                    <Textarea
                      id={`info-${it.key}`}
                      rows={2}
                      value={it.additionalInfo}
                      onChange={(e) => setItemField(it.key, 'additionalInfo', e.target.value)}
                      disabled={submitting}
                      placeholder="Note personalizare, culori, font…"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <span className="text-sm text-destructive" data-testid="add-product-error">
            {error}
          </span>
        )}

        <Button type="submit" disabled={submitting || items.length === 0} data-testid="add-product-submit">
          {submitting
            ? 'Se adaugă…'
            : items.length === 1
              ? 'Adaugă produs'
              : items.length > 1
                ? `Adaugă ${items.length} produse`
                : 'Adaugă produs'}
        </Button>
      </form>
    </>
  );
}
