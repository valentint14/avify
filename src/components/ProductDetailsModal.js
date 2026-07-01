'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ATTACHMENT_EXTENSIONS } from '../lib/constants.js';

const ACCEPTED_MIME = '.pdf,.png,.jpg,.jpeg,.webp';

export default function ProductDetailsModal({ product: initialProduct, onClose, onProductUpdated }) {
  const [product, setProduct] = useState(initialProduct);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const filename = product.graphicFilePath
    ? product.graphicFilePath.split('/').pop()
    : null;

  function applyUpdate(updated) {
    setProduct(updated);
    onProductUpdated?.(updated);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = file.name.split('.').pop().toLowerCase();
    if (!ATTACHMENT_EXTENSIONS.includes(ext)) {
      setUploadError(
        `Tip de fișier neacceptat. Tipuri acceptate: ${ATTACHMENT_EXTENSIONS.map((x) => x.toUpperCase()).join(', ')}.`
      );
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/products/${product.id}/attachment`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? 'Eroare la încărcare.');
      } else {
        applyUpdate(data.product);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setUploadError(null);
    const res = await fetch(`/api/products/${product.id}/attachment`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setUploadError(data.error ?? 'Eroare la ștergere.');
    } else {
      applyUpdate(data.product);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" data-testid="product-details-modal">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        {product.additionalInfo && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground" data-testid="product-details-body">
            {product.additionalInfo}
          </p>
        )}

        <div className="border-t border-border pt-3 mt-1" data-testid="product-attachment-section">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Grafică</p>

          {uploadError && (
            <p className="mb-2 text-xs text-destructive" data-testid="attachment-error">{uploadError}</p>
          )}

          {filename ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="truncate text-sm text-foreground max-w-[180px]" data-testid="attachment-filename" title={filename}>
                {filename}
              </span>
              <button
                type="button"
                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
                onClick={handleRemove}
                disabled={uploading}
                data-testid="attachment-remove"
                aria-label="Elimină fișierul grafică atașat"
              >
                Elimină
              </button>
              <button
                type="button"
                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid="attachment-replace"
                aria-label="Înlocuiește fișierul grafică atașat"
              >
                Înlocuiește
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="rounded border border-border px-3 py-1 text-sm hover:bg-muted"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              data-testid="attachment-attach"
              aria-label="Atașează fișier grafică pentru acest produs"
            >
              {uploading ? 'Se încarcă…' : 'Atașează fișier grafică'}
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_MIME}
            className="hidden"
            onChange={handleFileChange}
            data-testid="attachment-input"
            aria-label="Selectează fișier grafică"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
