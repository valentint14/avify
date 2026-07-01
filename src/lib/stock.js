'use strict';

const { getDb } = require('./db.js');
const { getOrderById } = require('./orders.js');
const { getProductsByOrder } = require('./products.js');
const { getRecipesByTemplateIds } = require('./recipes.js');

/**
 * Pure consumption calculation. For each product, multiply its ordered
 * quantity by the per-piece consumption of every material in its template's
 * recipe, summing across all products. Products without a template or recipe
 * contribute nothing.
 *
 * @param {object[]} products - order products ({ templateId, quantity })
 * @param {object} recipesByTemplateId - { [templateId]: [{ materialId, qtyPerPiece }] }
 * @returns {object} { [materialId]: totalQty }
 */
function computeConsumption(products, recipesByTemplateId) {
  const totals = {};
  for (const product of products) {
    if (!product.templateId) continue;
    const recipe = recipesByTemplateId[product.templateId];
    if (!recipe) continue;
    for (const line of recipe) {
      totals[line.materialId] = (totals[line.materialId] || 0) + product.quantity * line.qtyPerPiece;
    }
  }
  return totals;
}

/**
 * Deduct material stock for an order — idempotent and gated:
 *   - no-op if the order is missing, already deducted, or not yet complete
 *   - otherwise applies the consumption in a single transaction and marks
 *     the order as deducted (exactly once).
 *
 * @param {string} orderId
 * @returns {{ deducted: boolean, changes?: object }}
 */
function deductStockForOrder(orderId) {
  const db = getDb();
  const order = getOrderById(orderId);
  if (!order) return { deducted: false };

  const marker = db.prepare('SELECT stock_deducted FROM orders WHERE id = ?').get(orderId);
  if (marker && marker.stock_deducted) return { deducted: false };

  // status is 'finalizata' only when the order has products and all are 'realizat'
  if (order.status !== 'finalizata') return { deducted: false };

  const products = getProductsByOrder(orderId);
  const recipes = getRecipesByTemplateIds(products.map((p) => p.templateId));
  const consumption = computeConsumption(products, recipes);

  db.exec('BEGIN');
  try {
    const decrement = db.prepare('UPDATE materials SET current_stock = current_stock - ? WHERE id = ?');
    for (const [materialId, qty] of Object.entries(consumption)) {
      decrement.run(qty, materialId);
    }
    db.prepare('UPDATE orders SET stock_deducted = 1 WHERE id = ?').run(orderId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { deducted: true, changes: consumption };
}

module.exports = { computeConsumption, deductStockForOrder };
