'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

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

  if (loading) {
    return (
      <div className="mt-2 border-t border-border p-4">
        <p className="text-sm text-muted-foreground">Se încarcă…</p>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-border p-4">
      <span className="text-sm font-medium text-muted-foreground">Rețetă (consum per bucată)</span>

      {materials.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nu există materiale. Adaugă materiale în pagina „Stoc Materiale&rdquo; mai întâi.
        </p>
      )}

      {lines.length === 0 && materials.length > 0 && (
        <p className="text-sm text-muted-foreground">Nicio linie de rețetă. Adaugă un material.</p>
      )}

      {lines.map((line, index) => {
        const selectable = materials.filter((m) => m.id === line.materialId || !usedIds.has(m.id));
        return (
          <div key={index} className="flex flex-wrap items-center gap-2" data-testid="recipe-line">
            <Select
              value={line.materialId}
              onValueChange={(v) => setLine(index, 'materialId', v)}
              disabled={saving}
            >
              <SelectTrigger className="min-w-[160px] flex-1" aria-label="Material">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectable.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="w-28"
              type="number"
              min="0"
              step="0.01"
              placeholder="cant."
              value={line.qtyPerPiece}
              onChange={(e) => setLine(index, 'qtyPerPiece', e.target.value)}
              disabled={saving}
              aria-label="Consum per bucată"
            />
            <span className="min-w-8 text-sm text-muted-foreground">{unitFor(line.materialId)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLine(index)}
              disabled={saving}
              aria-label="Elimină linia"
            >
              ×
            </Button>
          </div>
        );
      })}

      <div className="mt-1 flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={saving || availableToAdd.length === 0}>
          + Adaugă material
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Se salvează…' : 'Salvează rețeta'}
        </Button>
      </div>

      {error && <span className="text-sm text-destructive">{error}</span>}
      {savedMsg && <span className="text-sm font-medium text-muted-foreground">{savedMsg}</span>}
    </div>
  );
}
