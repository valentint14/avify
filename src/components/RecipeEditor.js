'use client';

import { useEffect, useState } from 'react';
import '../styles/recipe.css';

export default function RecipeEditor({ templateId }) {
  const [materials, setMaterials] = useState([]);
  const [lines, setLines] = useState([]); // { materialId, qtyPerPiece }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/materials').then((r) => r.json()),
      fetch(`/api/catalog/${templateId}/recipe`).then((r) => r.json()),
    ])
      .then(([{ materials: mats }, { recipe }]) => {
        setMaterials(mats ?? []);
        setLines((recipe ?? []).map((l) => ({ materialId: l.materialId, qtyPerPiece: String(l.qtyPerPiece) })));
        setLoading(false);
      })
      .catch(() => {
        setError('Nu s-au putut încărca datele rețetei.');
        setLoading(false);
      });
  }, [templateId]);

  const usedIds = new Set(lines.map((l) => l.materialId));
  const availableToAdd = materials.filter((m) => !usedIds.has(m.id));

  function addLine() {
    if (availableToAdd.length === 0) return;
    setSavedMsg('');
    setLines((prev) => [...prev, { materialId: availableToAdd[0].id, qtyPerPiece: '' }]);
  }

  function setLine(index, field, value) {
    setSavedMsg('');
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function removeLine(index) {
    setSavedMsg('');
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function unitFor(materialId) {
    return materials.find((m) => m.id === materialId)?.unit ?? '';
  }

  async function handleSave() {
    setError('');
    setSavedMsg('');
    for (const l of lines) {
      const qty = Number(l.qtyPerPiece);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError('Consumul per bucată trebuie să fie un număr pozitiv.');
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/catalog/${templateId}/recipe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((l) => ({ materialId: l.materialId, qtyPerPiece: Number(l.qtyPerPiece) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Eroare la salvarea rețetei.');
        return;
      }
      setLines((data.recipe ?? []).map((l) => ({ materialId: l.materialId, qtyPerPiece: String(l.qtyPerPiece) })));
      setSavedMsg('Rețetă salvată.');
    } catch {
      setError('Eroare la salvarea rețetei.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="recipe-editor"><p className="recipe-editor-empty">Se încarcă…</p></div>;

  return (
    <div className="recipe-editor">
      <span className="recipe-editor-title">Rețetă (consum per bucată)</span>

      {materials.length === 0 && (
        <p className="recipe-editor-empty">
          Nu există materiale. Adaugă materiale în pagina „Stoc Materiale&rdquo; mai întâi.
        </p>
      )}

      {lines.length === 0 && materials.length > 0 && (
        <p className="recipe-editor-empty">Nicio linie de rețetă. Adaugă un material.</p>
      )}

      {lines.map((line, index) => {
        // Options: this line's current material + any not used by other lines
        const selectable = materials.filter(
          (m) => m.id === line.materialId || !usedIds.has(m.id)
        );
        return (
          <div key={index} className="recipe-line" data-testid="recipe-line">
            <select
              className="recipe-line-select"
              value={line.materialId}
              onChange={(e) => setLine(index, 'materialId', e.target.value)}
              disabled={saving}
              aria-label="Material"
            >
              {selectable.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <input
              className="recipe-line-qty"
              type="number"
              min="0"
              step="0.01"
              placeholder="cant."
              value={line.qtyPerPiece}
              onChange={(e) => setLine(index, 'qtyPerPiece', e.target.value)}
              disabled={saving}
              aria-label="Consum per bucată"
            />
            <span className="recipe-line-unit">{unitFor(line.materialId)}</span>
            <button
              className="recipe-line-remove"
              type="button"
              onClick={() => removeLine(index)}
              disabled={saving}
              aria-label="Elimină linia"
            >
              ×
            </button>
          </div>
        );
      })}

      <div className="recipe-editor-actions">
        <button
          className="recipe-editor-btn"
          type="button"
          onClick={addLine}
          disabled={saving || availableToAdd.length === 0}
        >
          + Adaugă material
        </button>
        <button
          className="recipe-editor-btn recipe-editor-btn--primary"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Se salvează…' : 'Salvează rețeta'}
        </button>
      </div>

      {error && <span className="recipe-editor-error">{error}</span>}
      {savedMsg && <span className="recipe-editor-title">{savedMsg}</span>}
    </div>
  );
}
