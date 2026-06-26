'use client';

import { useState } from 'react';
import ProductDetailsModal from './ProductDetailsModal.js';

export default function ProductCard({ product, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false);

  function handleCardClick(e) {
    if (e.target.closest('.product-card-delete')) return;
    if (product.additionalInfo) setModalOpen(true);
  }

  function handleDeleteClick(e) {
    e.stopPropagation();
    if (window.confirm(`Ștergi produsul "${product.name}"?`)) {
      onDelete(product.id);
    }
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
        className={`product-card${product.additionalInfo ? ' product-card--has-info' : ''}`}
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
        <span className="product-card-name">{product.name}</span>
        <span className="product-card-qty">×{product.quantity ?? 1}</span>
        <button
          className="product-card-delete"
          aria-label={`Șterge produsul ${product.name}`}
          onClick={handleDeleteClick}
        >
          ×
        </button>
      </div>
      {modalOpen && (
        <ProductDetailsModal
          product={product}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
