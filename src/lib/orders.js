'use strict';

const { getDb } = require('./db.js');

const DERIVED_STATUS_SQL = `
  SELECT
    o.id,
    o.name,
    o.created_at,
    o.client,
    o.reception_date,
    o.advance,
    o.county,
    o.contact_platform,
    o.event_date,
    o.delivery_date,
    o.profit,
    o.collected,
    o.delivered,
    COUNT(p.id)                                        AS product_count,
    COUNT(CASE WHEN p.status = 'realizat' THEN 1 END)  AS done_count,
    SUM(COALESCE(p.quantity, 0) * COALESCE(p.unit_price, 0)) AS total,
    CASE
      WHEN COUNT(p.id) > 0
       AND COUNT(CASE WHEN p.status != 'realizat' THEN 1 END) = 0
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
    total: Number(row.total ?? 0),
    client: row.client ?? null,
    receptionDate: row.reception_date ?? null,
    advance: Number(row.advance ?? 0),
    county: row.county ?? null,
    contactPlatform: row.contact_platform ?? null,
    eventDate: row.event_date ?? null,
    deliveryDate: row.delivery_date ?? null,
    profit: Number(row.profit ?? 0),
    collected: Boolean(row.collected),
    delivered: Boolean(row.delivered),
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

// Maps camelCase API field names to their orders table column + value coercion.
const ORDER_FIELD_COLUMNS = {
  client: { column: 'client', coerce: (v) => (v == null ? null : String(v)) },
  receptionDate: { column: 'reception_date', coerce: (v) => (v == null || v === '' ? null : String(v)) },
  advance: { column: 'advance', coerce: (v) => Number(v) || 0 },
  county: { column: 'county', coerce: (v) => (v == null ? null : String(v)) },
  contactPlatform: { column: 'contact_platform', coerce: (v) => (v == null ? null : String(v)) },
  eventDate: { column: 'event_date', coerce: (v) => (v == null || v === '' ? null : String(v)) },
  deliveryDate: { column: 'delivery_date', coerce: (v) => (v == null || v === '' ? null : String(v)) },
  profit: { column: 'profit', coerce: (v) => Number(v) || 0 },
  collected: { column: 'collected', coerce: (v) => (v ? 1 : 0) },
  delivered: { column: 'delivered', coerce: (v) => (v ? 1 : 0) },
};

function createOrder(name, fields = {}) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const effectiveFields =
    fields.receptionDate !== undefined
      ? fields
      : { ...fields, receptionDate: now.slice(0, 10) };
  const extraColumns = [];
  const extraValues = [];
  for (const [key, { column, coerce }] of Object.entries(ORDER_FIELD_COLUMNS)) {
    if (effectiveFields[key] !== undefined) {
      extraColumns.push(column);
      extraValues.push(coerce(effectiveFields[key]));
    }
  }
  const columns = ['id', 'name', 'created_at', ...extraColumns];
  const placeholders = columns.map(() => '?').join(', ');
  db.prepare(`INSERT INTO orders (${columns.join(', ')}) VALUES (${placeholders})`).run(
    id,
    name,
    now,
    ...extraValues
  );
  return getOrderById(id);
}

function updateOrder(id, fields = {}) {
  const db = getDb();
  const setClauses = [];
  const values = [];
  for (const [key, { column, coerce }] of Object.entries(ORDER_FIELD_COLUMNS)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(coerce(fields[key]));
    }
  }
  if (setClauses.length === 0) return null;
  values.push(id);
  const result = db
    .prepare(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`)
    .run(...values);
  if (result.changes === 0) return null;
  return getOrderById(id);
}

function deleteOrder(id) {
  const result = getDb().prepare('DELETE FROM orders WHERE id = ?').run(id);
  return result.changes > 0;
}

function createOrderWithProducts(name, templateIds = [], fields = {}) {
  const { createProductFromTemplate } = require('./products.js');
  const db = getDb();
  // Deduplicate: one catalog product per order per template
  const uniqueTemplateIds = [...new Set(templateIds)];
  db.exec('BEGIN');
  try {
    const order = createOrder(name, fields);
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

module.exports = { getAllWithStatus, getOrderById, createOrder, createOrderWithProducts, updateOrder, deleteOrder };
