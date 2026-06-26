'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/product-modal.css';

export default function ProductDetailsModal({ product, onClose }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return createPortal(
    <div
      className={`product-modal-overlay${open ? ' product-modal-overlay--open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        className="product-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdm-title"
      >
        <button
          className="product-modal-close"
          aria-label="Închide"
          onClick={onClose}
        >
          ×
        </button>
        <h2 id="pdm-title" className="product-modal-title">{product.name}</h2>
        <p className="product-modal-body">{product.additionalInfo}</p>
      </div>
    </div>,
    document.body
  );
}
