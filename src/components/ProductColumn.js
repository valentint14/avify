'use client';

import { useState } from 'react';
import ProductCard from './ProductCard.js';
import { cn } from '@/lib/utils';

export default function ProductColumn({ stage, products, onDrop, onDeleteProduct }) {
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
        'flex min-w-[160px] flex-1 flex-col rounded-md border-2 bg-card transition-colors',
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
          <ProductCard key={product.id} product={product} onDelete={onDeleteProduct} />
        ))}
      </div>
    </div>
  );
}
