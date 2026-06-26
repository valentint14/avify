'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'avify.db');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS orders (
    id               TEXT    PRIMARY KEY,
    primary_name     TEXT    NOT NULL,
    secondary_name   TEXT,
    event_date       TEXT    NOT NULL,
    event_type       TEXT    NOT NULL
                     CHECK (event_type IN ('nunta', 'botez')),
    product_types    TEXT    NOT NULL,
    payment_status   TEXT    NOT NULL
                     CHECK (payment_status IN ('neachitat', 'avans_achitat', 'achitat_integral')),
    stage            TEXT    NOT NULL DEFAULT 'de_facut'
                     CHECK (stage IN ('de_facut', 'in_design', 'validare_client',
                                      'printare', 'asamblare', 'livrat')),
    notes            TEXT,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_stage      ON orders (stage);
  CREATE INDEX IF NOT EXISTS idx_orders_event_date ON orders (event_date);
  CREATE INDEX IF NOT EXISTS idx_orders_payment    ON orders (payment_status);

  CREATE TABLE IF NOT EXISTS product_types (
    id        TEXT    PRIMARY KEY,
    name      TEXT    NOT NULL UNIQUE,
    is_custom INTEGER NOT NULL DEFAULT 0
  );

  INSERT OR IGNORE INTO product_types (id, name, is_custom) VALUES
    ('pt-1', 'Invitații',         0),
    ('pt-2', 'Meniu',             0),
    ('pt-3', 'Program',           0),
    ('pt-4', 'Plăcuțe de masă',   0),
    ('pt-5', 'Plic',              0),
    ('pt-6', 'Semn de bun venit', 0),
    ('pt-7', 'Altele',            0);
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
