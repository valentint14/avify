'use client';

import { useState } from 'react';
import CatalogSelector from './CatalogSelector.js';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AddProductForm({ orderId, onProductAdded, excludedTemplateIds = [] }) {
  const [mode, setMode] = useState('catalog');
  const [name, setName] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualInfo, setManualInfo] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [templateDetails, setTemplateDetails] = useState({});
  const [selectorKey, setSelectorKey] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isDisabled = submitting || (mode === 'catalog' ? selectedTemplates.length === 0 : false);

  function handleDetailChange(templateId, field, value) {
    setTemplateDetails((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], [field]: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (mode === 'catalog') {
      if (selectedTemplates.length === 0) {
        setError('Selectează cel puțin un produs din catalog.');
        return;
      }
      for (const tmpl of selectedTemplates) {
        const details = templateDetails[tmpl.id] ?? {};
        const qty = details.quantity !== undefined ? Number(details.quantity) : 1;
        if (!Number.isFinite(qty) || qty < 1) {
          setError(`Cantitatea pentru "${tmpl.name}" trebuie să fie un număr întreg pozitiv.`);
          return;
        }
      }
    } else {
      const trimmed = name.trim();
      if (!trimmed) {
        setError('Numele produsului este obligatoriu.');
        return;
      }
      const qty = Number(manualQty);
      if (!Number.isFinite(qty) || qty < 1) {
        setError('Cantitatea trebuie să fie un număr întreg pozitiv.');
        return;
      }
    }

    setError('');
    setSubmitting(true);
    try {
      if (mode === 'catalog') {
        for (const tmpl of selectedTemplates) {
          const details = templateDetails[tmpl.id] ?? {};
          const quantity = details.quantity !== undefined ? Math.trunc(Number(details.quantity)) : 1;
          const additionalInfo = details.additionalInfo?.trim() || null;
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, name: tmpl.name, templateId: tmpl.id, quantity, additionalInfo }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || 'Eroare la adăugarea produsului.');
            return;
          }
          onProductAdded(data.product);
        }
        setSelectedTemplates([]);
        setTemplateDetails({});
        setSelectorKey((k) => k + 1);
      } else {
        const trimmed = name.trim();
        const quantity = Math.trunc(Number(manualQty));
        const additionalInfo = manualInfo.trim() || null;
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, name: trimmed, quantity, additionalInfo }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Eroare la adăugarea produsului.');
          return;
        }
        setName('');
        setManualQty(1);
        setManualInfo('');
        onProductAdded(data.product);
      }
    } catch {
      setError('Eroare la adăugarea produsului.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-2 flex flex-col gap-3" data-testid="add-product-form" onSubmit={handleSubmit} noValidate>
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-md border border-border p-0.5">
          <button
            type="button"
            className={cn(
              'rounded px-3 py-1 text-sm transition-colors',
              mode === 'catalog' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'
            )}
            onClick={() => { setMode('catalog'); setError(''); }}
          >
            Din catalog
          </button>
          <button
            type="button"
            className={cn(
              'rounded px-3 py-1 text-sm transition-colors',
              mode === 'manual' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'
            )}
            onClick={() => { setMode('manual'); setError(''); }}
          >
            Scrie manual
          </button>
        </div>
        <Button type="submit" disabled={isDisabled} data-testid="add-product-submit" className="ml-auto shrink-0">
          {submitting ? 'Se adaugă…' : 'Adaugă produs'}
        </Button>
      </div>

      <div className={mode === 'catalog' ? 'block' : 'hidden'}>
        <CatalogSelector
          key={selectorKey}
          mode="multi"
          onSelectionChange={setSelectedTemplates}
          placeholder="Selectează din catalog…"
          excludedIds={excludedTemplateIds}
        />
        {selectedTemplates.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {selectedTemplates.map((tmpl) => {
              const details = templateDetails[tmpl.id] ?? {};
              return (
                <div key={tmpl.id} className="rounded-md border border-border p-2">
                  <span className="text-sm font-medium">{tmpl.name}</span>
                  <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground" htmlFor={`qty-${tmpl.id}`}>Cantitate</label>
                      <Input id={`qty-${tmpl.id}`} type="number" min="1" value={details.quantity ?? 1} onChange={(e) => handleDetailChange(tmpl.id, 'quantity', e.target.value)} disabled={submitting} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground" htmlFor={`info-${tmpl.id}`}>Informații suplimentare</label>
                      <Textarea id={`info-${tmpl.id}`} rows={2} value={details.additionalInfo ?? ''} onChange={(e) => handleDetailChange(tmpl.id, 'additionalInfo', e.target.value)} disabled={submitting} placeholder="Note personalizare, culori, font…" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={mode === 'manual' ? 'block' : 'hidden'}>
        <Input
          data-testid="add-product-input"
          type="text"
          placeholder="Numele produsului…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          aria-label="Numele produsului"
        />
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="manual-qty">Cantitate</label>
            <Input id="manual-qty" type="number" min="1" value={manualQty} onChange={(e) => setManualQty(e.target.value)} disabled={submitting} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="manual-info">Informații suplimentare</label>
            <Textarea id="manual-info" rows={2} value={manualInfo} onChange={(e) => setManualInfo(e.target.value)} disabled={submitting} placeholder="Note personalizare, culori, font…" />
          </div>
        </div>
      </div>

      {error && <span className="text-sm text-destructive" data-testid="add-product-error">{error}</span>}
    </form>
  );
}
