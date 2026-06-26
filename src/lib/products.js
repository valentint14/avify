'use strict';

const { getDb } = require('./db.js');
const { VALID_STAGES } = require('./constants.js');

function parseRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    name: row.name,
    status: row.status,
    templateId: row.template_id ?? null,
    createdAt: row.created_at,
  };
}

function getProductsByOrder(orderId) {
  const rows = getDb()
    .prepare('SELECT * FROM products WHERE order_id = ? ORDER BY created_at ASC')
    .all(orderId);
  return rows.map(parseRow);
}

function createProduct(orderId, name, templateId = null) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO products (id, order_id, name, status, template_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, orderId, name, 'de_facut', templateId, now);
  return parseRow(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
}

function createProductFromTemplate(orderId, templateId) {
  const { getById } = require('./productTemplates.js');
  const template = getById(templateId);
  if (!template) return null;
  return createProduct(orderId, template.name, templateId);
}

function updateProductStatus(productId, status) {
  if (!VALID_STAGES.includes(status)) return null;
  const db = getDb();
  const result = db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, productId);
  if (result.changes === 0) return null;
  return parseRow(db.prepare('SELECT * FROM products WHERE id = ?').get(productId));
}

function deleteProduct(productId) {
  const result = getDb().prepare('DELETE FROM products WHERE id = ?').run(productId);
  return result.changes > 0;
}

module.exports = { getProductsByOrder, createProduct, createProductFromTemplate, updateProductStatus, deleteProduct, VALID_STAGES };
