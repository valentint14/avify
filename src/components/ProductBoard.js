'use client';

import { useState, useEffect } from 'react';
import { STAGES } from '../lib/constants.js';
import ProductColumn from './ProductColumn.js';
import AddProductForm from './AddProductForm.js';
import '../styles/product-board.css';

export default function ProductBoard({ orderId, onProductChange, refreshKey }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`/api/products?orderId=${orderId}`)
      .then((r) => r.json())
      .then(({ products: loaded }) => setProducts(loaded || []));
  }, [orderId, refreshKey]);

  async function handleDrop(productId, _fromStage, toStageId) {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: toStageId }),
    });
    if (res.ok) {
      const { product: updated } = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      onProductChange();
    }
  }

  async function handleDeleteProduct(productId) {
    const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      onProductChange();
    }
  }

  function handleProductAdded(newProduct) {
    setProducts((prev) => [...prev, newProduct]);
    onProductChange();
  }

  return (
    <div className="product-board" data-testid="product-board">
      <div className="product-board-columns">
        {STAGES.map((stage) => (
          <ProductColumn
            key={stage.id}
            stage={stage}
            products={products.filter((p) => p.status === stage.id)}
            onDrop={handleDrop}
            onDeleteProduct={handleDeleteProduct}
          />
        ))}
      </div>
      <AddProductForm
        orderId={orderId}
        onProductAdded={handleProductAdded}
        excludedTemplateIds={products.filter((p) => p.templateId).map((p) => p.templateId)}
      />
    </div>
  );
}
