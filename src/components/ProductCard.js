'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
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

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

function getFileExt(filePath) {
  return filePath.split('.').pop().toLowerCase();
}

export default function ProductCard({ product: initialProduct, onDelete }) {
  const [product, setProduct] = useState(initialProduct);
  const [modalOpen, setModalOpen] = useState(false);
  const [fileError, setFileError] = useState(null);

  function handleCardClick(e) {
    if (e.target.closest('[data-testid="product-delete"]') || e.target.closest('[role="alertdialog"]')) return;
    if (e.target.closest('[data-testid="product-file-indicator"]')) return;
    setModalOpen(true);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target.closest('[data-testid="product-file-indicator"]')) return;
      e.preventDefault();
      setModalOpen(true);
    }
  }

  async function handleOpenFile(e) {
    e.stopPropagation();
    setFileError(null);
    try {
      const res = await fetch(`/api/products/${product.id}/attachment/open`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setFileError(data.error ?? 'Eroare la deschidere.');
      }
    } catch {
      setFileError('Eroare la deschidere.');
    }
  }

  const filePath = product.graphicFilePath;
  const fileExt = filePath ? getFileExt(filePath) : null;
  const isImage = fileExt && IMAGE_EXTENSIONS.has(fileExt);
  const isPdf = fileExt === 'pdf';

  return (
    <>
      <div
        className={cn(
          'group flex flex-col gap-0.5 rounded-md border border-border bg-background px-2 py-1.5 text-sm shadow-sm cursor-pointer',
          (product.additionalInfo || filePath) && 'ring-1 ring-blue-200'
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
        <div className="flex items-center justify-between gap-1">
          <span className="flex-1 truncate text-foreground">{product.name}</span>

          {(isImage || isPdf) && (
            <button
              type="button"
              className="shrink-0 flex items-center text-muted-foreground hover:text-foreground"
              data-testid="product-file-indicator"
              aria-label={isPdf ? 'Deschide grafică PDF' : 'Deschide grafică'}
              onClick={handleOpenFile}
            >
              {isPdf ? (
                <FileText className="h-4 w-4" />
              ) : (
                <img
                  src={`/api/products/${product.id}/attachment`}
                  className="h-4 w-4 rounded object-cover"
                  alt=""
                />
              )}
            </button>
          )}

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
                <AlertDialogTitle>Ștergi &bdquo;{product.name}&rdquo;?</AlertDialogTitle>
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

        {fileError && (
          <p className="text-xs text-destructive" data-testid="product-file-error">{fileError}</p>
        )}
      </div>

      {modalOpen && (
        <ProductDetailsModal
          product={product}
          onClose={() => setModalOpen(false)}
          onProductUpdated={(updated) => setProduct(updated)}
        />
      )}
    </>
  );
}
