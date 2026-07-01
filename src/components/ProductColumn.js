'use client';

import { useState } from 'react';
import ProductCard from './ProductCard.js';
import { cn } from '@/lib/utils';

export default function ProductColumn({ stage, products, approvedProductIds = new Set(), revisionsMap = {}, onDrop, onDeleteProduct, onAttachmentChange, onMoveProduct }) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const productId = e.dataTransfer.getData('productId');
    const fromStage = e.dataTransfer.getData('fromStage');
    if (productId && fromStage !== stage.id) {
      onDrop(productId, fromStage, stage.id);
    }
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-md border-2 bg-card transition-colors md:min-w-[160px] md:flex-1',
        isDragOver ? 'border-blue-500 bg-blue-50' : 'border-border'
      )}
      data-testid="product-column"
      data-stage={stage.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium text-foreground" data-testid="product-column-label">{stage.label}</span>
        <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">{products.length}</span>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {products.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground" data-testid="product-column-empty">Niciun produs în această coloană</p>
        )}
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isApproved={approvedProductIds.has(product.id)}
            revisionHistory={revisionsMap[product.id] ?? []}
            onDelete={onDeleteProduct}
            onAttachmentChange={onAttachmentChange}
            onMoveProduct={onMoveProduct}
          />
        ))}
      </div>
    </div>
  );
}
