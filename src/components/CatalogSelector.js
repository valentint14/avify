'use client';

import { useState, useEffect, useRef } from 'react';
import '../styles/catalog.css';

export default function CatalogSelector({ mode = 'multi', onSelectionChange, placeholder = 'Caută produse din catalog…' }) {
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

  const filtered = query
    ? allTemplates.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : allTemplates;

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
    <div className="catalog-selector" ref={containerRef}>
      {mode === 'multi' && selected.length > 0 && (
        <div className="catalog-selector-chips">
          {selected.map((t, i) => (
            <span key={`${t.id}-${i}`} className="catalog-chip">
              {t.name}
              <button
                type="button"
                className="catalog-chip-remove"
                aria-label={`Elimină ${t.name}`}
                onClick={() => removeSelected(t.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        className="catalog-selector-input"
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        aria-label="Caută produse din catalog"
        autoComplete="off"
      />

      {open && (
        <div className="catalog-selector-dropdown">
          {allTemplates.length === 0 ? (
            <div className="catalog-selector-empty">
              Catalogul este gol — accesează{' '}
              <a href="/catalog">/catalog</a>{' '}
              pentru a adăuga produse.
            </div>
          ) : filtered.length === 0 ? (
            <div className="catalog-selector-empty">Niciun produs găsit.</div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="catalog-selector-option"
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
