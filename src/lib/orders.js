'use strict';

const { getDb } = require('./db.js');

const { VALID_STAGES, VALID_PAYMENT, VALID_EVENTS } = require('./constants.js');

function parseRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    primaryName: row.primary_name,
    secondaryName: row.secondary_name ?? null,
    eventDate: row.event_date,
    eventType: row.event_type,
    productTypes: JSON.parse(row.product_types),
    paymentStatus: row.payment_status,
    stage: row.stage,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getAll(filters = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (filters.payment_status) {
    conditions.push('payment_status = ?');
    params.push(filters.payment_status);
  }
  if (filters.event_date_from) {
    conditions.push('event_date >= ?');
    params.push(filters.event_date_from);
  }
  if (filters.event_date_to) {
    conditions.push('event_date <= ?');
    params.push(filters.event_date_to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM orders ${where} ORDER BY event_date ASC, created_at ASC`).all(...params);
  return rows.map(parseRow);
}

function getById(id) {
  const row = getDb().prepare('SELECT * FROM orders WHERE id = ?').get(id);
  return parseRow(row);
}

function create(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO orders
      (id, primary_name, secondary_name, event_date, event_type, product_types,
       payment_status, stage, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.primaryName,
    data.secondaryName ?? null,
    data.eventDate,
    data.eventType,
    JSON.stringify(data.productTypes),
    data.paymentStatus,
    data.stage ?? 'de_facut',
    data.notes ?? null,
    now,
    now
  );
  return getById(id);
}

function update(id, patch) {
  const db = getDb();
  const current = getById(id);
  if (!current) return null;

  const fields = [];
  const params = [];

  const allowed = ['primaryName', 'secondaryName', 'eventDate', 'eventType', 'productTypes', 'paymentStatus', 'stage', 'notes'];
  const colMap = {
    primaryName: 'primary_name',
    secondaryName: 'secondary_name',
    eventDate: 'event_date',
    eventType: 'event_type',
    productTypes: 'product_types',
    paymentStatus: 'payment_status',
    stage: 'stage',
    notes: 'notes',
  };

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      fields.push(`${colMap[key]} = ?`);
      const val = key === 'productTypes' ? JSON.stringify(patch[key]) : (patch[key] ?? null);
      params.push(val);
    }
  }

  if (fields.length === 0) return current;

  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getById(id);
}

function deleteOrder(id) {
  const result = getDb().prepare('DELETE FROM orders WHERE id = ?').run(id);
  return result.changes > 0;
}

function getAllProductTypes() {
  const rows = getDb().prepare('SELECT * FROM product_types ORDER BY is_custom ASC, name ASC').all();
  return rows.map((r) => ({ id: r.id, name: r.name, isCustom: r.is_custom === 1 }));
}

function createProductType(name) {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO product_types (id, name, is_custom) VALUES (?, ?, 1)').run(id, name);
  return { id, name, isCustom: true };
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteOrder,
  getAllProductTypes,
  createProductType,
  VALID_STAGES,
  VALID_PAYMENT,
  VALID_EVENTS,
};
