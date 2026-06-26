'use strict';

const { getDb } = require('./db.js');

function parseRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.created_at,
  };
}

function listAll() {
  return getDb()
    .prepare('SELECT * FROM product_templates ORDER BY name ASC')
    .all()
    .map(parseRow);
}

function search(q) {
  if (!q) return listAll();
  return getDb()
    .prepare('SELECT * FROM product_templates WHERE name LIKE ? ORDER BY name ASC')
    .all(`%${q}%`)
    .map(parseRow);
}

function getById(id) {
  const row = getDb().prepare('SELECT * FROM product_templates WHERE id = ?').get(id);
  return row ? parseRow(row) : null;
}

function create(name, description) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) throw new Error('Numele produsului este obligatoriu.');
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO product_templates (id, name, description, created_at) VALUES (?, ?, ?, ?)'
  ).run(id, trimmed, description ?? null, now);
  return parseRow(db.prepare('SELECT * FROM product_templates WHERE id = ?').get(id));
}

function update(id, fields) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM product_templates WHERE id = ?').get(id);
  if (!existing) return null;

  const newName = 'name' in fields ? fields.name : existing.name;
  const trimmedName = typeof newName === 'string' ? newName.trim() : '';
  if (!trimmedName) throw new Error('Numele produsului este obligatoriu.');

  const newDescription = 'description' in fields ? fields.description : existing.description;

  db.prepare('UPDATE product_templates SET name = ?, description = ? WHERE id = ?').run(
    trimmedName,
    newDescription ?? null,
    id
  );
  return parseRow(db.prepare('SELECT * FROM product_templates WHERE id = ?').get(id));
}

function deleteById(id) {
  const result = getDb().prepare('DELETE FROM product_templates WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = { listAll, search, getById, create, update, deleteById };
