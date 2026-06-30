'use client';

import { useState, useEffect, useRef } from 'react';

export default function CatalogSelector({ mode = 'multi', onSelectionChange, placeholder = 'Caută produse din catalog…', excludedIds = [] }) {
  const [allTemplates, setAllTemplates] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(({ templates }) => setAllTemplates(templates ?? []))
      .catch(() => setAllTemplates([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const selectedIds = new Set(selected.map((t) => t.id));
  const excluded = new Set(excludedIds);
  const available = allTemplates.filter((t) => !selectedIds.has(t.id) && !excluded.has(t.id));
  const filtered = query
    ? available.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : available;

  function selectTemplate(template) {
    let next;
    if (mode === 'single') {
      next = [template];
    } else {
      next = [...selected, template];
    }
    setSelected(next);
    onSelectionChange(next);
    setQuery('');
    setOpen(false);
  }

  function removeSelected(id) {
    const next = selected.filter((t) => t.id !== id);
    setSelected(next);
    onSelectionChange(next);
  }

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm focus-within:ring-1 focus-within:ring-ring"
        onClick={() => { setOpen(true); }}
      >
        {mode === 'multi' && selected.map((t, i) => (
          <span
            key={`${t.id}-${i}`}
            className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            data-testid="catalog-chip"
          >
            {t.name}
            <button
              type="button"
              className="leading-none text-muted-foreground hover:text-destructive"
              aria-label={`Elimină ${t.name}`}
              onClick={(e) => { e.stopPropagation(); removeSelected(t.id); }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          type="text"
          placeholder={selected.length === 0 ? placeholder : 'Selectează mai multe produse…'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label="Caută produse din catalog"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md" data-testid="catalog-selector-dropdown">
          {allTemplates.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Catalogul este gol — accesează{' '}
              <a className="underline" href="/catalog">/catalog</a>{' '}
              pentru a adăuga produse.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">Niciun produs găsit.</div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                data-testid="catalog-option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectTemplate(t);
                }}
              >
                {t.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
