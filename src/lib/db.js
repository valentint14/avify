'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'avify.db');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS orders (
    id         TEXT NOT NULL PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

  CREATE TABLE IF NOT EXISTS products (
    id         TEXT NOT NULL PRIMARY KEY,
    order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'de_facut'
               CHECK (status IN (
                 'de_facut', 'in_design', 'validare_client',
                 'printare', 'asamblare', 'gata'
               )),
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_order_id ON products (order_id);
  CREATE INDEX IF NOT EXISTS idx_products_status   ON products (status);
`;

function openDb(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec(SCHEMA);
  return db;
}

// Survive Next.js hot-module replacement in development
const g = globalThis;
function getDb() {
  if (!g._avifyDb) {
    g._avifyDb = openDb(DB_PATH);
  }
  return g._avifyDb;
}

module.exports = { getDb, openDb };
