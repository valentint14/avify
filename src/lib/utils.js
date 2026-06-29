import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge conditional class names and de-duplicate conflicting Tailwind classes.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
