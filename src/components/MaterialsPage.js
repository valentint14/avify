'use client';

import { useState, useMemo } from 'react';
import MaterialForm from './MaterialForm.js';
import { lowStockMaterials, isLowStock } from '../lib/lowStock.js';
import '../styles/materials.css';

export default function MaterialsPage({ initialMaterials }) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');

  const lowStock = useMemo(() => lowStockMaterials(materials), [materials]);

  function sortByName(list) {
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  }

  async function handleAdd(fields) {
    setError('');
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Eroare la adăugarea materialului.');
      return;
    }
    setMaterials((prev) => sortByName([...prev, data.material]));
  }

  async function handleEdit(id, fields) {
    setError('');
    const res = await fetch(`/api/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Eroare la actualizarea materialului.');
      return;
    }
    setMaterials((prev) => sortByName(prev.map((m) => (m.id === id ? data.material : m))));
    setEditingId(null);
  }

  async function handleDelete(id) {
    setError('');
    const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Eroare la ștergerea materialului.');
      return;
    }
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div className="materials-page">
      <div className="materials-header">
        <h1 className="materials-title">Stoc Materiale</h1>
        <p className="materials-subtitle">
          Gestionează materiile prime și pragurile minime de stoc.
        </p>
      </div>

      {lowStock.length > 0 && (
        <div className="materials-alert" role="status">
          <span className="materials-alert-title">⚠ Stoc sub minim</span>
          <ul className="materials-alert-list">
            {lowStock.map((m) => (
              <li key={m.id}>
                {m.name}: {m.currentStock} {m.unit ?? ''} (minim {m.minStock})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="materials-add-section">
        <p className="materials-add-title">Adaugă material nou</p>
        <MaterialForm key="add-form" onSave={handleAdd} submitLabel="Adaugă" />
        {error && <p className="material-form-error" style={{ marginTop: '8px' }}>{error}</p>}
      </div>

      <div className="materials-list">
        {materials.length === 0 && (
          <p className="materials-empty">Niciun material. Adaugă primul material de mai sus.</p>
        )}

        {materials.map((m) =>
          editingId === m.id ? (
            <div key={m.id} className="material-row">
              <MaterialForm
                initialValues={{
                  name: m.name,
                  currentStock: String(m.currentStock),
                  minStock: String(m.minStock),
                  unit: m.unit ?? '',
                }}
                onSave={(fields) => handleEdit(m.id, fields)}
                onCancel={() => setEditingId(null)}
                submitLabel="Salvează"
              />
            </div>
          ) : (
            <div key={m.id} className={`material-row${isLowStock(m) ? ' material-row--low' : ''}`}>
              <span className="material-row-name">{m.name}</span>
              <span className="material-row-stock">
                {m.currentStock} {m.unit ?? ''} · minim {m.minStock}
              </span>
              {isLowStock(m) && <span className="material-row-low-badge">Sub minim</span>}

              {confirmDeleteId === m.id ? (
                <div className="material-row-actions">
                  <button
                    className="material-row-btn material-row-btn--danger"
                    onClick={() => handleDelete(m.id)}
                  >
                    Confirmă
                  </button>
                  <button className="material-row-btn" onClick={() => setConfirmDeleteId(null)}>
                    Anulează
                  </button>
                </div>
              ) : (
                <div className="material-row-actions">
                  <button
                    className="material-row-btn"
                    onClick={() => {
                      setEditingId(m.id);
                      setConfirmDeleteId(null);
                    }}
                  >
                    Editează
                  </button>
                  <button
                    className="material-row-btn material-row-btn--danger"
                    onClick={() => {
                      setConfirmDeleteId(m.id);
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
