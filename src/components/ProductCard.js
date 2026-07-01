'use client';

import { useState } from 'react';
import { FileText, CheckCircle, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { STAGES } from '../lib/constants.js';
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

export default function ProductCard({ product: initialProduct, isApproved = false, revisionHistory = [], onDelete, onAttachmentChange, onMoveProduct }) {
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

          {isApproved && (
            <span
              className="shrink-0 flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800"
              title="Design aprobat de client"
              data-testid="product-approved-badge"
            >
              <CheckCircle className="h-3 w-3" />
              Aprobat
            </span>
          )}

          {revisionHistory.length > 0 && !isApproved && (
            <span
              className="shrink-0 flex items-center text-amber-500"
              title="Corecturi solicitate de client"
              data-testid="product-revision-badge"
            >
              <AlertTriangle className="h-4 w-4" />
            </span>
          )}

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

          {(() => {
            const stageIndex = STAGES.findIndex((s) => s.id === product.status);
            return (
              <span className="flex shrink-0 items-center gap-0.5 md:hidden">
                <button
                  type="button"
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  disabled={stageIndex <= 0}
                  title={stageIndex > 0 ? `Mută în „${STAGES[stageIndex - 1].label}"` : undefined}
                  onClick={(e) => { e.stopPropagation(); onMoveProduct?.(product.id, product.status, STAGES[stageIndex - 1].id); }}
                  aria-label={stageIndex > 0 ? `Mută în ${STAGES[stageIndex - 1].label}` : 'Prima etapă'}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  disabled={stageIndex >= STAGES.length - 1}
                  title={stageIndex < STAGES.length - 1 ? `Mută în „${STAGES[stageIndex + 1].label}"` : undefined}
                  onClick={(e) => { e.stopPropagation(); onMoveProduct?.(product.id, product.status, STAGES[stageIndex + 1].id); }}
                  aria-label={stageIndex < STAGES.length - 1 ? `Mută în ${STAGES[stageIndex + 1].label}` : 'Ultima etapă'}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })()}

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
          revisionHistory={revisionHistory}
          onClose={() => setModalOpen(false)}
          onProductUpdated={(updated) => setProduct(updated)}
          onAttachmentChange={onAttachmentChange}
        />
      )}
    </>
  );
}
