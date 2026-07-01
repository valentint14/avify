'use client';

import { useState } from 'react';
import CatalogProductForm from './CatalogProductForm.js';
import RecipeEditor from './RecipeEditor.js';
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

export default function CatalogPage({ initialTemplates }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editingId, setEditingId] = useState(null);
  const [recipeId, setRecipeId] = useState(null);
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
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Catalog Produse</h1>
        <p className="text-sm text-muted-foreground">
          Gestionează produsele șablon care pot fi selectate la crearea comenzilor.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm" data-testid="catalog-add">
        <p className="mb-2 font-medium">Adaugă produs nou</p>
        <CatalogProductForm key="add-form" onSave={handleAdd} submitLabel="Adaugă" />
        {error && <p className="mt-2 text-sm text-destructive" data-testid="catalog-error">{error}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        {templates.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center" data-testid="catalog-empty">
            <p className="font-medium text-foreground">Catalogul este gol</p>
            <p className="text-sm text-muted-foreground">Adaugă primul produs folosind formularul de mai sus.</p>
          </div>
        )}

        {templates.map((t) =>
          editingId === t.id ? (
            <div key={t.id} className="rounded-md border border-border bg-card p-3 shadow-sm" data-testid="catalog-item">
              <CatalogProductForm
                initialName={t.name}
                initialDescription={t.description ?? ''}
                onSave={(fields) => handleEdit(t.id, fields)}
                onCancel={() => setEditingId(null)}
                submitLabel="Salvează"
              />
            </div>
          ) : (
            <div key={t.id} className="rounded-md border border-border bg-card shadow-sm" data-testid="catalog-item">
              <div className="flex items-center gap-4 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{t.name}</div>
                  {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRecipeId((prev) => (prev === t.id ? null : t.id));
                      setEditingId(null);
                    }}
                  >
                    {recipeId === t.id ? 'Ascunde rețeta' : 'Rețetă'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(t.id);
                      setRecipeId(null);
                    }}
                  >
                    Editează
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">Șterge</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ștergi „{t.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>Produsul șablon va fi eliminat din catalog.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anulează</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(t.id)}>Șterge</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {recipeId === t.id && <RecipeEditor templateId={t.id} />}
            </div>
          )
        )}
      </div>
    </div>
  );
}
