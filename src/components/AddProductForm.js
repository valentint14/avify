'use client';

import { useState } from 'react';
import CatalogSelector from './CatalogSelector.js';
import '../styles/form.css';
import '../styles/catalog.css';

export default function AddProductForm({ orderId, onProductAdded }) {
  const [mode, setMode] = useState('catalog');
  const [name, setName] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [selectorKey, setSelectorKey] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isDisabled = submitting || (mode === 'catalog' ? selectedTemplates.length === 0 : false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (mode === 'catalog') {
      if (selectedTemplates.length === 0) {
        setError('Selectează cel puțin un produs din catalog.');
        return;
      }
    } else {
      const trimmed = name.trim();
      if (!trimmed) {
        setError('Numele produsului este obligatoriu.');
        return;
      }
    }

    setError('');
    setSubmitting(true);
    try {
      if (mode === 'catalog') {
        for (const tmpl of selectedTemplates) {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, name: tmpl.name, templateId: tmpl.id }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || 'Eroare la adăugarea produsului.');
            return;
          }
          onProductAdded(data.product);
        }
        setSelectedTemplates([]);
        setSelectorKey((k) => k + 1);
      } else {
        const trimmed = name.trim();
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, name: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Eroare la adăugarea produsului.');
          return;
        }
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
    <form className="add-form add-product-form" onSubmit={handleSubmit} noValidate style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div className="mode-toggle" style={{ margin: 0 }}>
          <button
            type="button"
            className={`mode-toggle-btn${mode === 'catalog' ? ' mode-toggle-btn--active' : ''}`}
            onClick={() => { setMode('catalog'); setError(''); }}
          >
            Din catalog
          </button>
          <button
            type="button"
            className={`mode-toggle-btn${mode === 'manual' ? ' mode-toggle-btn--active' : ''}`}
            onClick={() => { setMode('manual'); setError(''); }}
          >
            Scrie manual
          </button>
        </div>
        <button className="add-form-btn" type="submit" disabled={isDisabled} style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {submitting ? 'Se adaugă…' : 'Adaugă produs'}
        </button>
      </div>

      {mode === 'manual' ? (
        <input
          className="add-form-input"
          type="text"
          placeholder="Numele produsului…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          aria-label="Numele produsului"
        />
      ) : (
        <CatalogSelector
          key={selectorKey}
          mode="multi"
          onSelectionChange={setSelectedTemplates}
          placeholder="Selectează din catalog…"
        />
      )}

      {error && <span className="add-form-error">{error}</span>}
    </form>
  );
}
