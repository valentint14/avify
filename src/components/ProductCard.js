'use client';

import { useState } from 'react';
import ProductDetailsModal from './ProductDetailsModal.js';

export default function ProductCard({ product, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function handleCardClick(e) {
    if (e.target.closest('.product-card-delete')) return;
    if (product.additionalInfo) setModalOpen(true);
  }

  function handleDeleteClick(e) {
    e.stopPropagation();
    setConfirming(true);
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ' ') && product.additionalInfo) {
      e.preventDefault();
      setModalOpen(true);
    }
  }

  if (confirming) {
    return (
      <div className="product-card product-card--confirm" role="alertdialog" aria-label={`Confirmă ștergerea produsului ${product.name}`}>
        <span className="product-card-confirm-text">Ștergi „{product.name}&rdquo;?</span>
        <button
          className="product-card-confirm-btn product-card-confirm-btn--yes"
          onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
        >
          Șterge
        </button>
        <button
          className="product-card-confirm-btn"
          onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
        >
          Anulează
        </button>
      </div>
    );
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
