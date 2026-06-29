'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/product-modal.css';

const CONTACT_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'Telefon', 'Email'];

const EMPTY_ORDER_FIELDS = {
  client: '',
  receptionDate: '',
  advance: '',
  county: '',
  contactPlatform: '',
  eventDate: '',
  deliveryDate: '',
  profit: '',
  collected: false,
  delivered: false,
};

export default function EditOrderModal({ orderId, onClose, onSaved, onDelete }) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [edits, setEdits] = useState({});
  const [orderFields, setOrderFields] = useState(EMPTY_ORDER_FIELDS);
  const [orderName, setOrderName] = useState('');
  const [customPlatform, setCustomPlatform] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/products?orderId=${orderId}`).then((r) => r.json()),
      fetch('/api/orders').then((r) => r.json()),
    ])
      .then(([{ products: list }, { orders }]) => {
        setProducts(list ?? []);
        const order = (orders ?? []).find((o) => o.id === orderId);
        if (order) {
          setOrderName(order.name ?? '');
          const platform = order.contactPlatform ?? '';
          setCustomPlatform(platform !== '' && !CONTACT_PLATFORMS.includes(platform));
          setOrderFields({
            client: order.client ?? '',
            receptionDate: order.receptionDate ?? '',
            advance: order.advance ? String(order.advance) : '',
            county: order.county ?? '',
            contactPlatform: platform,
            eventDate: order.eventDate ?? '',
            deliveryDate: order.deliveryDate ?? '',
            profit: order.profit ? String(order.profit) : '',
            collected: Boolean(order.collected),
            delivered: Boolean(order.delivered),
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Nu s-au putut încărca datele comenzii.');
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

  function setField(field, value) {
    setOrderFields((prev) => ({ ...prev, [field]: value }));
  }

  function handlePlatformSelect(value) {
    if (value === 'Altele') {
      setCustomPlatform(true);
      setField('contactPlatform', '');
    } else {
      setCustomPlatform(false);
      setField('contactPlatform', value);
    }
  }

  function currentValue(product, field) {
    const edit = edits[product.id];
    if (edit && field in edit) return edit[field];
    if (field === 'quantity') return product.quantity;
    if (field === 'unitPrice') return product.unitPrice ?? 0;
    return product.additionalInfo ?? '';
  }

  const liveTotal = products.reduce((sum, p) => {
    const qty = Number(currentValue(p, 'quantity')) || 0;
    const price = Number(currentValue(p, 'unitPrice')) || 0;
    return sum + qty * price;
  }, 0);

  async function handleSave() {
    const dirty = products.filter((p) => {
      const e = edits[p.id];
      if (!e) return false;
      const qtyChanged = e.quantity !== undefined && Number(e.quantity) !== p.quantity;
      const infoChanged = e.additionalInfo !== undefined && e.additionalInfo !== (p.additionalInfo ?? '');
      const priceChanged = e.unitPrice !== undefined && Number(e.unitPrice) !== (p.unitPrice ?? 0);
      return qtyChanged || infoChanged || priceChanged;
    });

    for (const p of dirty) {
      const e = edits[p.id];
      const qty = e.quantity !== undefined ? Number(e.quantity) : p.quantity;
      if (!Number.isFinite(qty) || qty < 1) {
        setError(`Cantitatea pentru "${p.name}" trebuie să fie un număr întreg pozitiv.`);
        return;
      }
      const price = e.unitPrice !== undefined ? Number(e.unitPrice) : p.unitPrice ?? 0;
      if (!Number.isFinite(price) || price < 0) {
        setError(`Prețul unitar pentru "${p.name}" trebuie să fie un număr pozitiv.`);
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const orderBody = {
        client: orderFields.client || null,
        receptionDate: orderFields.receptionDate || null,
        advance: orderFields.advance === '' ? 0 : Number(orderFields.advance),
        county: orderFields.county || null,
        contactPlatform: orderFields.contactPlatform || null,
        eventDate: orderFields.eventDate || null,
        deliveryDate: orderFields.deliveryDate || null,
        profit: orderFields.profit === '' ? 0 : Number(orderFields.profit),
        collected: orderFields.collected,
        delivered: orderFields.delivered,
      };
      const orderRes = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderBody),
      });
      if (!orderRes.ok) {
        const data = await orderRes.json();
        setError(data.error || 'Eroare la salvarea comenzii.');
        return;
      }

      for (const p of dirty) {
        const e = edits[p.id];
        const body = {};
        if (e.quantity !== undefined) body.quantity = Math.trunc(Number(e.quantity));
        if (e.additionalInfo !== undefined) body.additionalInfo = e.additionalInfo || null;
        if (e.unitPrice !== undefined) body.unitPrice = Number(e.unitPrice);
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
      setError('Eroare la salvarea comenzii.');
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    setDeleting(true);
    setError('');
    try {
      await onDelete(orderId);
      onClose();
    } catch {
      setError('Eroare la ștergerea comenzii.');
      setDeleting(false);
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const busy = saving || deleting;

  return createPortal(
    <div
      className={`product-modal-overlay${open ? ' product-modal-overlay--open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Editează comanda"
      >
        {/* Header */}
        <div className="edit-modal-header">
          <h2 className="edit-modal-title">Editează comanda</h2>
          <button className="edit-modal-close" aria-label="Închide" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="edit-modal-body">
          {loading && <p className="edit-modal-empty">Se încarcă…</p>}

          {!loading && (
            <>
              {/* Order details */}
              <div>
                <h3 className="edit-modal-section-title">Detalii comandă</h3>
                <div className="edit-modal-order-details">
                  <div className="edit-modal-order-field">
                    <label className="edit-modal-label" htmlFor="ord-client">Client</label>
                    <input
                      id="ord-client"
                      type="text"
                      className="edit-modal-input"
                      value={orderFields.client}
                      onChange={(e) => setField('client', e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="edit-modal-order-field">
                    <label className="edit-modal-label" htmlFor="ord-county">Județ</label>
                    <input
                      id="ord-county"
                      type="text"
                      className="edit-modal-input"
                      value={orderFields.county}
                      onChange={(e) => setField('county', e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="edit-modal-order-field">
                    <label className="edit-modal-label" htmlFor="ord-reception">Dată primire</label>
                    <input
                      id="ord-reception"
                      type="date"
                      className="edit-modal-input"
                      value={orderFields.receptionDate}
                      onChange={(e) => setField('receptionDate', e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="edit-modal-order-field">
                    <label className="edit-modal-label" htmlFor="ord-event">Dată eveniment</label>
                    <input
                      id="ord-event"
                      type="date"
                      className="edit-modal-input"
                      value={orderFields.eventDate}
                      onChange={(e) => setField('eventDate', e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="edit-modal-order-field">
                    <label className="edit-modal-label" htmlFor="ord-delivery">Termen livrare</label>
                    <input
                      id="ord-delivery"
                      type="date"
                      className="edit-modal-input"
                      value={orderFields.deliveryDate}
                      onChange={(e) => setField('deliveryDate', e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="edit-modal-order-field">
                    <label className="edit-modal-label" htmlFor="ord-advance">Avans (RON)</label>
                    <input
                      id="ord-advance"
                      type="number"
                      min="0"
                      step="0.01"
                      className="edit-modal-input"
                      value={orderFields.advance}
                      onChange={(e) => setField('advance', e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="edit-modal-order-field">
                    <label className="edit-modal-label" htmlFor="ord-profit">Profit (RON)</label>
                    <input
                      id="ord-profit"
                      type="number"
                      step="0.01"
                      className="edit-modal-input"
                      value={orderFields.profit}
                      onChange={(e) => setField('profit', e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="edit-modal-order-field">
                    <label className="edit-modal-label" htmlFor="ord-platform">Platformă contact</label>
                    <select
                      id="ord-platform"
                      className="edit-modal-input"
                      value={customPlatform ? 'Altele' : orderFields.contactPlatform}
                      onChange={(e) => handlePlatformSelect(e.target.value)}
                      disabled={saving}
                    >
                      <option value="">—</option>
                      {CONTACT_PLATFORMS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="Altele">Altele</option>
                    </select>
                  </div>
                  {customPlatform && (
                    <div className="edit-modal-order-field edit-modal-order-field--full">
                      <label className="edit-modal-label" htmlFor="ord-platform-custom">
                        Platformă personalizată
                      </label>
                      <input
                        id="ord-platform-custom"
                        type="text"
                        className="edit-modal-input"
                        value={orderFields.contactPlatform}
                        onChange={(e) => setField('contactPlatform', e.target.value)}
                        disabled={saving}
                        placeholder="ex. WhatsApp"
                      />
                    </div>
                  )}
                  <div className="edit-modal-checks">
                    <label className="edit-modal-check">
                      <input
                        type="checkbox"
                        checked={orderFields.collected}
                        onChange={(e) => setField('collected', e.target.checked)}
                        disabled={saving}
                      />
                      Încasată
                    </label>
                    <label className="edit-modal-check">
                      <input
                        type="checkbox"
                        checked={orderFields.delivered}
                        onChange={(e) => setField('delivered', e.target.checked)}
                        disabled={saving}
                      />
                      Livrată
                    </label>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="edit-modal-section-title">Produse</h3>
                {products.length === 0 && (
                  <p className="edit-modal-empty">Niciun produs în această comandă.</p>
                )}
                {products.length > 0 && (
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
                          <div className="edit-modal-field edit-modal-field--unit-price">
                            <label className="edit-modal-label" htmlFor={`price-${p.id}`}>
                              Preț unitar (RON)
                            </label>
                            <input
                              id={`price-${p.id}`}
                              type="number"
                              className="edit-modal-input-qty"
                              min="0"
                              step="0.01"
                              value={currentValue(p, 'unitPrice')}
                              onChange={(e) => handleChange(p.id, 'unitPrice', e.target.value)}
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
                <div className="edit-modal-total-summary">
                  <span>Total comandă:</span>
                  <strong>{liveTotal.toFixed(2)} RON</strong>
                </div>
              </div>
            </>
          )}

          {error && <p className="edit-modal-error">{error}</p>}
        </div>

        {/* Footer */}
        {confirmDelete ? (
          <div className="edit-modal-footer edit-modal-footer--confirm">
            <span className="edit-modal-confirm-text">
              Ștergi comanda {orderName ? `„${orderName}"` : 'aceasta'}? Toate produsele vor fi șterse.
            </span>
            <button
              type="button"
              className="edit-modal-btn edit-modal-btn--secondary"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Anulează
            </button>
            <button
              type="button"
              className="edit-modal-btn edit-modal-btn--danger"
              onClick={performDelete}
              disabled={deleting}
            >
              {deleting ? 'Se șterge…' : 'Confirmă ștergerea'}
            </button>
          </div>
        ) : (
          <div className="edit-modal-footer">
            <button
              type="button"
              className="edit-modal-btn edit-modal-btn--danger edit-modal-btn--delete"
              onClick={() => setConfirmDelete(true)}
              disabled={busy || loading}
            >
              Șterge comanda
            </button>
            <button
              type="button"
              className="edit-modal-btn edit-modal-btn--secondary"
              onClick={onClose}
              disabled={busy}
            >
              Anulează
            </button>
            <button
              type="button"
              className="edit-modal-btn edit-modal-btn--primary"
              onClick={handleSave}
              disabled={busy || loading}
            >
              {saving ? 'Se salvează…' : 'Salvează'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
