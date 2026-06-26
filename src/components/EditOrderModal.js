'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/product-modal.css';

export default function EditOrderModal({ orderId, onClose, onSaved }) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    fetch(`/api/products?orderId=${orderId}`)
      .then((r) => r.json())
      .then(({ products: list }) => {
        setProducts(list ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('Nu s-au putut încărca produsele.');
        setLoading(false);
      });
  }, [orderId]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleChange(productId, field, value) {
    setEdits((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  }

  function currentValue(product, field) {
    const edit = edits[product.id];
    if (edit && field in edit) return edit[field];
    return field === 'quantity' ? product.quantity : product.additionalInfo ?? '';
  }

  async function handleSave() {
    const dirty = products.filter((p) => {
      const e = edits[p.id];
      if (!e) return false;
      const qtyChanged = e.quantity !== undefined && Number(e.quantity) !== p.quantity;
      const infoChanged = e.additionalInfo !== undefined && e.additionalInfo !== (p.additionalInfo ?? '');
      return qtyChanged || infoChanged;
    });

    for (const p of dirty) {
      const e = edits[p.id];
      const qty = e.quantity !== undefined ? Number(e.quantity) : p.quantity;
      if (!Number.isFinite(qty) || qty < 1) {
        setError(`Cantitatea pentru "${p.name}" trebuie să fie un număr întreg pozitiv.`);
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      for (const p of dirty) {
        const e = edits[p.id];
        const body = {};
        if (e.quantity !== undefined) body.quantity = Math.trunc(Number(e.quantity));
        if (e.additionalInfo !== undefined) body.additionalInfo = e.additionalInfo || null;
        const res = await fetch(`/api/products/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Eroare la salvarea produsului.');
          return;
        }
      }
      onSaved();
      onClose();
    } catch {
      setError('Eroare la salvarea produselor.');
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return createPortal(
    <div
      className={`product-modal-overlay${open ? ' product-modal-overlay--open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Editează produse"
      >
        {/* Header */}
        <div className="edit-modal-header">
          <h2 className="edit-modal-title">Editează produse</h2>
          <button className="edit-modal-close" aria-label="Închide" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="edit-modal-body">
          {loading && (
            <p className="edit-modal-empty">Se încarcă…</p>
          )}
          {!loading && products.length === 0 && (
            <p className="edit-modal-empty">Niciun produs în această comandă.</p>
          )}
          {!loading && products.length > 0 && (
            <div className="edit-modal-list">
              {products.map((p) => (
                <div key={p.id} className="edit-modal-product">
                  <p className="edit-modal-product-name">{p.name}</p>
                  <div className="edit-modal-fields">
                    <div className="edit-modal-field edit-modal-field--qty">
                      <label className="edit-modal-label" htmlFor={`qty-${p.id}`}>
                        Cantitate
                      </label>
                      <input
                        id={`qty-${p.id}`}
                        type="number"
                        className="edit-modal-input-qty"
                        min="1"
                        value={currentValue(p, 'quantity')}
                        onChange={(e) => handleChange(p.id, 'quantity', e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="edit-modal-field edit-modal-field--info">
                      <label className="edit-modal-label" htmlFor={`info-${p.id}`}>
                        Informații suplimentare
                      </label>
                      <textarea
                        id={`info-${p.id}`}
                        className="edit-modal-textarea"
                        value={currentValue(p, 'additionalInfo')}
                        onChange={(e) => handleChange(p.id, 'additionalInfo', e.target.value)}
                        disabled={saving}
                        rows={2}
                        placeholder="Culori, fonturi, text personalizat…"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="edit-modal-error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="edit-modal-footer">
          <button
            type="button"
            className="edit-modal-btn edit-modal-btn--secondary"
            onClick={onClose}
            disabled={saving}
          >
            Anulează
          </button>
          <button
            type="button"
            className="edit-modal-btn edit-modal-btn--primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'Se salvează…' : 'Salvează'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
