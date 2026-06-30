'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ProductDetailsModal({ product, onClose }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" data-testid="product-details-modal">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground" data-testid="product-details-body">
          {product.additionalInfo}
        </p>
      </DialogContent>
    </Dialog>
  );
}
