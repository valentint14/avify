'use strict';

const { getDb } = require('./db.js');
const { isLowStock, lowStockMaterials } = require('./lowStock.js');

function parseRow(row) {
  return {
    id: row.id,
    name: row.name,
    currentStock: Number(row.current_stock ?? 0),
    minStock: Number(row.min_stock ?? 0),
    unit: row.unit ?? null,
    createdAt: row.created_at,
  };
}

function listAll() {
  return getDb()
    .prepare('SELECT * FROM materials ORDER BY name ASC')
    .all()
    .map(parseRow);
}

function getById(id) {
  const row = getDb().prepare('SELECT * FROM materials WHERE id = ?').get(id);
  return row ? parseRow(row) : null;
}

function create({ name, currentStock = 0, minStock = 0, unit = null } = {}) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) throw new Error('Numele materialului este obligatoriu.');
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO materials (id, name, current_stock, min_stock, unit, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, trimmed, Number(currentStock) || 0, Number(minStock) || 0, unit || null, now);
  return getById(id);
}

// Maps camelCase API field names to their materials column + value coercion.
const FIELD_COLUMNS = {
  name: { column: 'name', coerce: (v) => String(v).trim() },
  currentStock: { column: 'current_stock', coerce: (v) => Number(v) || 0 },
  minStock: { column: 'min_stock', coerce: (v) => Number(v) || 0 },
  unit: { column: 'unit', coerce: (v) => (v == null || v === '' ? null : String(v)) },
};

function update(id, fields = {}) {
  const db = getDb();
  const setClauses = [];
  const values = [];
  for (const [key, { column, coerce }] of Object.entries(FIELD_COLUMNS)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(coerce(fields[key]));
    }
  }
  if (setClauses.length === 0) return null;
  values.push(id);
  const result = db
    .prepare(`UPDATE materials SET ${setClauses.join(', ')} WHERE id = ?`)
    .run(...values);
  if (result.changes === 0) return null;
  return getById(id);
}

function deleteById(id) {
  const result = getDb().prepare('DELETE FROM materials WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  listAll,
  getById,
  create,
  update,
  deleteById,
  isLowStock,
  lowStockMaterials,
};
