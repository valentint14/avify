'use client';

import { useState } from 'react';
import CatalogProductForm from './CatalogProductForm.js';
import '../styles/catalog.css';

export default function CatalogPage({ initialTemplates }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');

  async function handleAdd({ name, description }) {
    setError('');
    const res = await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Eroare la adăugarea produsului.');
      return;
    }
    setTemplates((prev) =>
      [...prev, data.template].sort((a, b) => a.name.localeCompare(b.name, 'ro'))
    );
  }

  async function handleEdit(id, { name, description }) {
    setError('');
    const res = await fetch(`/api/catalog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Eroare la actualizarea produsului.');
      return;
    }
    setTemplates((prev) =>
      prev
        .map((t) => (t.id === id ? data.template : t))
        .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
    );
    setEditingId(null);
  }

  async function handleDelete(id) {
    setError('');
    const res = await fetch(`/api/catalog/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Eroare la ștergerea produsului.');
      return;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <h1 className="catalog-title">Catalog Produse</h1>
        <p className="catalog-subtitle">
          Gestionează produsele șablon care pot fi selectate la crearea comenzilor.
        </p>
      </div>

      <div className="catalog-add-section">
        <p className="catalog-add-title">Adaugă produs nou</p>
        <CatalogProductForm
          key="add-form"
          onSave={handleAdd}
          submitLabel="Adaugă"
        />
        {error && <p className="catalog-form-error" style={{ marginTop: '8px' }}>{error}</p>}
      </div>

      <div className="catalog-list">
        {templates.length === 0 && (
          <div className="catalog-empty">
            <p className="catalog-empty-title">Catalogul este gol</p>
            <p className="catalog-empty-hint">Adaugă primul produs folosind formularul de mai sus.</p>
          </div>
        )}

        {templates.map((t) =>
          editingId === t.id ? (
            <div key={t.id} className="catalog-item catalog-item--editing">
              <CatalogProductForm
                initialName={t.name}
                initialDescription={t.description ?? ''}
                onSave={(fields) => handleEdit(t.id, fields)}
                onCancel={() => setEditingId(null)}
                submitLabel="Salvează"
              />
            </div>
          ) : (
            <div key={t.id} className="catalog-item">
              <div className="catalog-item-info">
                <div className="catalog-item-name">{t.name}</div>
                {t.description && (
                  <div className="catalog-item-desc">{t.description}</div>
                )}
              </div>

              {confirmDeleteId === t.id ? (
                <div className="catalog-delete-confirm">
                  <span className="catalog-delete-confirm-text">Ești sigur?</span>
                  <button
                    className="catalog-item-btn catalog-item-btn--danger"
                    onClick={() => handleDelete(t.id)}
                  >
                    Confirmă
                  </button>
                  <button
                    className="catalog-item-btn"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Anulează
                  </button>
                </div>
              ) : (
                <div className="catalog-item-actions">
                  <button
                    className="catalog-item-btn"
                    onClick={() => {
                      setEditingId(t.id);
                      setConfirmDeleteId(null);
                    }}
                  >
                    Editează
                  </button>
                  <button
                    className="catalog-item-btn catalog-item-btn--danger"
                    onClick={() => {
                      setConfirmDeleteId(t.id);
                      setEditingId(null);
                    }}
                  >
                    Șterge
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
