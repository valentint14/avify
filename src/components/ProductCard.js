'use client';

export default function ProductCard({ product, onDelete }) {
  function handleDeleteClick(e) {
    e.stopPropagation();
    if (window.confirm(`Ștergi produsul "${product.name}"?`)) {
      onDelete(product.id);
    }
  }

  return (
    <div
      className="product-card"
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('productId', product.id);
        e.dataTransfer.setData('fromStage', product.status);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <span className="product-card-name">{product.name}</span>
      <button
        className="product-card-delete"
        aria-label={`Șterge produsul ${product.name}`}
        onClick={handleDeleteClick}
      >
        ×
      </button>
    </div>
  );
}
