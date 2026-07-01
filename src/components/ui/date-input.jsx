'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

function isoToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return d ? `${d}/${m}/${y}` : iso;
}

function displayToISO(raw) {
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

export default function DateInput({ value, onChange, disabled, id, ...props }) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));

  useEffect(() => {
    setDisplay(isoToDisplay(value));
  }, [value]);

  function handleBlur() {
    const iso = displayToISO(display);
    if (iso !== null) {
      setDisplay(iso ? isoToDisplay(iso) : '');
      onChange(iso);
    }
    // Invalid input — leave display unchanged, don't propagate
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder="ZZ/LL/AAAA"
      value={display}
      onChange={(e) => setDisplay(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      {...props}
    />
  );
}
