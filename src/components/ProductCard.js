'use client';

import { useState } from 'react';
import ProductDetailsModal from './ProductDetailsModal.js';
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

export default function ProductCard({ product, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false);

  function handleCardClick(e) {
    if (e.target.closest('[data-testid="product-delete"]') || e.target.closest('[role="alertdialog"]')) return;
    if (product.additionalInfo) setModalOpen(true);
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ' ') && product.additionalInfo) {
      e.preventDefault();
      setModalOpen(true);
    }
  }

  return (
    <>
      <div
        className={cn(
          'group flex items-center justify-between gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm shadow-sm',
          product.additionalInfo && 'cursor-pointer ring-1 ring-blue-200'
        )}
        data-testid="product-card"
        draggable={true}
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onDragStart={(e) => {
          e.dataTransfer.setData('productId', product.id);
          e.dataTransfer.setData('fromStage', product.status);
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        <span className="flex-1 truncate text-foreground">{product.name}</span>
        <span className="shrink-0 text-xs font-medium text-muted-foreground" data-testid="product-qty-badge">×{product.quantity ?? 1}</span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded px-1 leading-none text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              data-testid="product-delete"
              aria-label={`Șterge produsul ${product.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              ×
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Ștergi „{product.name}”?</AlertDialogTitle>
              <AlertDialogDescription>Produsul va fi eliminat din comandă.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction data-testid="product-delete-confirm" onClick={() => onDelete(product.id)}>
                Șterge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {modalOpen && <ProductDetailsModal product={product} onClose={() => setModalOpen(false)} />}
    </>
  );
}
