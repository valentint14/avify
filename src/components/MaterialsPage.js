'use client';

import { useState, useMemo } from 'react';
import MaterialForm from './MaterialForm.js';
import { lowStockMaterials, isLowStock } from '../lib/lowStock.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export default function MaterialsPage({ initialMaterials }) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [editingId, setEditingId] = useState(null);
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
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Stoc Materiale</h1>
        <p className="text-sm text-muted-foreground">
          Gestionează materiile prime și pragurile minime de stoc.
        </p>
      </div>

      {lowStock.length > 0 && (
        <div
          className="flex flex-col gap-1 rounded-md border border-warn/40 bg-warn-bg p-4 text-warn-fg"
          role="status"
          data-testid="materials-alert"
        >
          <span className="font-bold">⚠ Stoc sub minim</span>
          <ul className="list-disc pl-6 text-sm">
            {lowStock.map((m) => (
              <li key={m.id}>
                {m.name}: {m.currentStock} {m.unit ?? ''} (minim {m.minStock})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm" data-testid="materials-add">
        <p className="mb-2 font-medium">Adaugă material nou</p>
        <MaterialForm key="add-form" onSave={handleAdd} submitLabel="Adaugă" />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col gap-1.5" data-testid="materials-list">
        {materials.length === 0 && (
          <p className="p-8 text-center text-muted-foreground">Niciun material. Adaugă primul material de mai sus.</p>
        )}

        {materials.map((m) =>
          editingId === m.id ? (
            <div
              key={m.id}
              className="rounded-md border border-border bg-card p-3 shadow-sm"
              data-testid="material-row"
            >
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
            <div
              key={m.id}
              className={cn(
                'flex items-center gap-4 rounded-md border bg-card p-3 shadow-sm',
                isLowStock(m) ? 'border-warn' : 'border-border'
              )}
              data-testid="material-row"
            >
              <span className="flex-1 font-medium text-foreground">{m.name}</span>
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {m.currentStock} {m.unit ?? ''} · minim {m.minStock}
              </span>
              {isLowStock(m) && <Badge variant="warn">Sub minim</Badge>}

              <div className="flex shrink-0 gap-1">
                <Button variant="outline" size="sm" onClick={() => setEditingId(m.id)}>
                  Editează
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      Șterge
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ștergi „{m.name}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Materialul va fi eliminat și scos din rețetele care îl folosesc.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anulează</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(m.id)}>Șterge</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
