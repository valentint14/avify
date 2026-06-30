'use client';

import { useState } from 'react';
import ProductCard from './ProductCard.js';

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
      className={`product-column${isDragOver ? ' drag-over' : ''}`}
      data-testid="product-column"
      data-stage={stage.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="product-column-header">
        <span className="product-column-label">{stage.label}</span>
        <span className="product-column-count">{products.length}</span>
      </div>
      <div className="product-column-cards">
        {products.length === 0 && (
          <p className="product-column-empty">Niciun produs în această coloană</p>
        )}
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onDelete={onDeleteProduct}
          />
        ))}
      </div>
    </div>
  );
}
