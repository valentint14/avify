'use client';

import { useState } from 'react';
import CatalogSelector from './CatalogSelector.js';
import '../styles/form.css';
import '../styles/catalog.css';

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
    <form className="add-form add-product-form" data-testid="add-product-form" onSubmit={handleSubmit} noValidate style={{ flexDirection: 'column', alignItems: 'stretch' }}>
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
        <button className="add-form-btn" data-testid="add-product-submit" type="submit" disabled={isDisabled} style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {submitting ? 'Se adaugă…' : 'Adaugă produs'}
        </button>
      </div>

      <div style={{ display: mode === 'catalog' ? 'block' : 'none' }}>
        <div className="manual-details">
          <CatalogSelector
            key={selectorKey}
            mode="multi"
            onSelectionChange={setSelectedTemplates}
            placeholder="Selectează din catalog…"
            excludedIds={excludedTemplateIds}
          />
          {selectedTemplates.length > 0 && (
            <div className="template-details-list">
              {selectedTemplates.map((tmpl) => {
                const details = templateDetails[tmpl.id] ?? {};
                return (
                  <div key={tmpl.id} className="catalog-product-details">
                    <span className="manual-details-product-name">{tmpl.name}</span>
                    <div className="manual-details-fields">
                      <div className="manual-details-field">
                        <label className="manual-details-label" htmlFor={`qty-${tmpl.id}`}>Cantitate</label>
                        <input
                          id={`qty-${tmpl.id}`}
                          type="number"
                          className="template-details-qty"
                          min="1"
                          value={details.quantity ?? 1}
                          onChange={(e) => handleDetailChange(tmpl.id, 'quantity', e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="manual-details-field">
                        <label className="manual-details-label" htmlFor={`info-${tmpl.id}`}>Informații suplimentare</label>
                        <textarea
                          id={`info-${tmpl.id}`}
                          className="template-details-info"
                          value={details.additionalInfo ?? ''}
                          onChange={(e) => handleDetailChange(tmpl.id, 'additionalInfo', e.target.value)}
                          disabled={submitting}
                          placeholder="Note personalizare, culori, font…"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: mode === 'manual' ? undefined : 'none' }}>
        <div className="manual-details">
          <input
            className="manual-details-name"
            data-testid="add-product-input"
            type="text"
            placeholder="Numele produsului…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            aria-label="Numele produsului"
          />
          <div className="manual-details-fields">
            <div className="manual-details-field">
              <label className="manual-details-label" htmlFor="manual-qty">Cantitate</label>
              <input
                id="manual-qty"
                type="number"
                className="template-details-qty"
                min="1"
                value={manualQty}
                onChange={(e) => setManualQty(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="manual-details-field">
              <label className="manual-details-label" htmlFor="manual-info">Informații suplimentare</label>
              <textarea
                id="manual-info"
                className="template-details-info"
                value={manualInfo}
                onChange={(e) => setManualInfo(e.target.value)}
                disabled={submitting}
                placeholder="Note personalizare, culori, font…"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <span className="add-form-error" data-testid="add-product-error">{error}</span>}
    </form>
  );
}
