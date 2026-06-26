'use strict';

const { getDb } = require('./db.js');

const DERIVED_STATUS_SQL = `
  SELECT
    o.id,
    o.name,
    o.created_at,
    COUNT(p.id)                                        AS product_count,
    COUNT(CASE WHEN p.status = 'gata' THEN 1 END)     AS done_count,
    CASE
      WHEN COUNT(p.id) > 0
       AND COUNT(CASE WHEN p.status != 'gata' THEN 1 END) = 0
      THEN 'finalizata'
      ELSE 'in_progres'
    END                                                AS status
  FROM orders o
  LEFT JOIN products p ON p.order_id = o.id
  GROUP BY o.id
  ORDER BY o.created_at DESC
`;

function parseRow(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    productCount: Number(row.product_count),
    doneCount: Number(row.done_count),
    createdAt: row.created_at,
  };
}

function getAllWithStatus() {
  const rows = getDb().prepare(DERIVED_STATUS_SQL).all();
  return rows.map(parseRow);
}

function getOrderById(id) {
  const sql = DERIVED_STATUS_SQL.replace('GROUP BY o.id', 'WHERE o.id = ? GROUP BY o.id');
  const row = getDb().prepare(sql).get(id);
  return row ? parseRow(row) : null;
}

function createOrder(name) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO orders (id, name, created_at)
    VALUES (?, ?, ?)
  `).run(id, name, now);
  return getOrderById(id);
}

function deleteOrder(id) {
  const result = getDb().prepare('DELETE FROM orders WHERE id = ?').run(id);
  return result.changes > 0;
}

function createOrderWithProducts(name, templateIds = []) {
  const { createProductFromTemplate } = require('./products.js');
  const db = getDb();
  // Deduplicate: one catalog product per order per template
  const uniqueTemplateIds = [...new Set(templateIds)];
  db.exec('BEGIN');
  try {
    const order = createOrder(name);
    const products = [];
    for (const templateId of uniqueTemplateIds) {
      const product = createProductFromTemplate(order.id, templateId);
      if (product) products.push(product);
    }
    db.exec('COMMIT');
    return { order: getOrderById(order.id), products };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { getAllWithStatus, getOrderById, createOrder, createOrderWithProducts, deleteOrder };
