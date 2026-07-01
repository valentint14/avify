'use client';

import { useState, useEffect } from 'react';
import { STAGES } from '../lib/constants.js';
import ProductColumn from './ProductColumn.js';
import AddProductForm from './AddProductForm.js';

export default function ProductBoard({ orderId, onProductChange, refreshKey }) {
  const [products, setProducts] = useState([]);
  const [approvedProductIds, setApprovedProductIds] = useState(new Set());
  const [revisionsMap, setRevisionsMap] = useState({});

  useEffect(() => {
    fetch(`/api/products?orderId=${orderId}`)
      .then((r) => r.json())
      .then(({ products: loaded }) => setProducts(loaded || []));
    fetch(`/api/orders/${orderId}/approval-status`)
      .then((r) => r.json())
      .then(({ approvedProductIds: ids }) => setApprovedProductIds(new Set(ids || [])));
    fetch(`/api/orders/${orderId}/revision-status`)
      .then((r) => r.json())
      .then(({ revisions }) => setRevisionsMap(revisions || {}));
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

  function handleAttachmentChange() {
    fetch(`/api/orders/${orderId}/approval-status`)
      .then((r) => r.json())
      .then(({ approvedProductIds: ids }) => setApprovedProductIds(new Set(ids || [])));
    fetch(`/api/orders/${orderId}/revision-status`)
      .then((r) => r.json())
      .then(({ revisions }) => setRevisionsMap(revisions || {}));
  }

  return (
    <div className="rounded-b-lg border-t border-border bg-muted/30 p-4 animate-in fade-in slide-in-from-top-1" data-testid="product-board">
      <div className="flex flex-col gap-2 md:flex-row md:overflow-x-auto md:pb-2">
        {STAGES.map((stage) => (
          <ProductColumn
            key={stage.id}
            stage={stage}
            products={products.filter((p) => p.status === stage.id)}
            approvedProductIds={approvedProductIds}
            revisionsMap={revisionsMap}
            onDrop={handleDrop}
            onDeleteProduct={handleDeleteProduct}
            onAttachmentChange={handleAttachmentChange}
            onMoveProduct={handleDrop}
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
