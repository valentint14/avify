import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge conditional class names and de-duplicate conflicting Tailwind classes.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format a YYYY-MM-DD string as DD/MM/YYYY.
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// Format an ISO datetime string as DD/MM/YYYY HH:MM (local time, ro-RO).
export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso)
    .toLocaleString('ro-RO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    .replace(/\./g, '/');
}
