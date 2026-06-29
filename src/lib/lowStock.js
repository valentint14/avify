'use strict';

// Pure, DB-free stock-threshold helpers — safe to import into client
// components (the materials data layer re-exports these). A material is
// "low" only when its current stock is STRICTLY below its minimum.
function isLowStock(material) {
  return material.currentStock < material.minStock;
}

function lowStockMaterials(list) {
  return list.filter(isLowStock);
}

module.exports = { isLowStock, lowStockMaterials };
