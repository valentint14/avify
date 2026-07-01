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

  CREATE TABLE IF NOT EXISTS product_templates (
    id          TEXT NOT NULL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_product_templates_name ON product_templates (name);

  CREATE TABLE IF NOT EXISTS products (
    id          TEXT NOT NULL PRIMARY KEY,
    order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'de_realizat'
                CHECK (status IN ('de_realizat', 'in_realizare', 'realizat')),
    created_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_order_id ON products (order_id);
  CREATE INDEX IF NOT EXISTS idx_products_status   ON products (status);

  CREATE TABLE IF NOT EXISTS materials (
    id            TEXT NOT NULL PRIMARY KEY,
    name          TEXT NOT NULL,
    current_stock REAL NOT NULL DEFAULT 0,
    min_stock     REAL NOT NULL DEFAULT 0,
    unit          TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_materials_name ON materials (name);

  CREATE TABLE IF NOT EXISTS recipe_lines (
    id            TEXT NOT NULL PRIMARY KEY,
    template_id   TEXT NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
    material_id   TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    qty_per_piece REAL NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_lines_unique   ON recipe_lines (template_id, material_id);
  CREATE INDEX IF NOT EXISTS        idx_recipe_lines_template ON recipe_lines (template_id);
`;

function openDb(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  // Enforce declared foreign keys so ON DELETE CASCADE / SET NULL fire
  // (e.g. deleting a material removes its recipe lines).
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  const cols = db.prepare('PRAGMA table_info(products)').all();
  if (!cols.some((c) => c.name === 'template_id')) {
    db.exec(
      'ALTER TABLE products ADD COLUMN template_id TEXT REFERENCES product_templates(id) ON DELETE SET NULL'
    );
  }
  if (!cols.some((c) => c.name === 'quantity')) {
    db.exec('ALTER TABLE products ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1');
  }
  if (!cols.some((c) => c.name === 'additional_info')) {
    db.exec('ALTER TABLE products ADD COLUMN additional_info TEXT');
  }
  if (!cols.some((c) => c.name === 'unit_price')) {
    db.exec('ALTER TABLE products ADD COLUMN unit_price REAL DEFAULT 0');
  }
  if (!cols.some((c) => c.name === 'graphic_file_path')) {
    db.exec('ALTER TABLE products ADD COLUMN graphic_file_path TEXT');
  }

  // Migrate from 6-stage to 3-stage product workflow
  const tableRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'").get();
  if (tableRow && tableRow.sql && tableRow.sql.includes("'de_facut'")) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(`
      CREATE TABLE products_new (
        id                TEXT NOT NULL PRIMARY KEY,
        order_id          TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        name              TEXT NOT NULL,
        status            TEXT NOT NULL DEFAULT 'de_realizat'
                          CHECK (status IN ('de_realizat', 'in_realizare', 'realizat')),
        created_at        TEXT NOT NULL,
        template_id       TEXT REFERENCES product_templates(id) ON DELETE SET NULL,
        quantity          INTEGER NOT NULL DEFAULT 1,
        additional_info   TEXT,
        unit_price        REAL DEFAULT 0,
        graphic_file_path TEXT
      );
      INSERT INTO products_new
        SELECT
          id, order_id, name,
          CASE status
            WHEN 'de_facut'        THEN 'de_realizat'
            WHEN 'in_design'       THEN 'in_realizare'
            WHEN 'validare_client' THEN 'in_realizare'
            WHEN 'printare'        THEN 'in_realizare'
            WHEN 'asamblare'       THEN 'in_realizare'
            WHEN 'gata'            THEN 'realizat'
            ELSE 'de_realizat'
          END,
          created_at, template_id, COALESCE(quantity, 1), additional_info,
          COALESCE(unit_price, 0), graphic_file_path
        FROM products;
      DROP TABLE products;
      ALTER TABLE products_new RENAME TO products;
      CREATE INDEX IF NOT EXISTS idx_products_order_id ON products (order_id);
      CREATE INDEX IF NOT EXISTS idx_products_status   ON products (status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_products_order_template ON products (order_id, template_id) WHERE template_id IS NOT NULL;
    `);
    db.exec('PRAGMA foreign_keys = ON');
  }

  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_products_order_template ON products (order_id, template_id) WHERE template_id IS NOT NULL'
  );

  // Order metadata fields (feature 006): client, dates, financials, status flags
  const orderCols = db.prepare('PRAGMA table_info(orders)').all();
  const orderMigrations = [
    ['client', 'ALTER TABLE orders ADD COLUMN client TEXT'],
    ['reception_date', 'ALTER TABLE orders ADD COLUMN reception_date TEXT'],
    ['advance', 'ALTER TABLE orders ADD COLUMN advance REAL DEFAULT 0'],
    ['county', 'ALTER TABLE orders ADD COLUMN county TEXT'],
    ['contact_platform', 'ALTER TABLE orders ADD COLUMN contact_platform TEXT'],
    ['event_date', 'ALTER TABLE orders ADD COLUMN event_date TEXT'],
    ['delivery_date', 'ALTER TABLE orders ADD COLUMN delivery_date TEXT'],
    ['profit', 'ALTER TABLE orders ADD COLUMN profit REAL DEFAULT 0'],
    ['collected', 'ALTER TABLE orders ADD COLUMN collected INTEGER NOT NULL DEFAULT 0'],
    ['delivered', 'ALTER TABLE orders ADD COLUMN delivered INTEGER NOT NULL DEFAULT 0'],
    ['stock_deducted', 'ALTER TABLE orders ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0'],
  ];
  for (const [name, sql] of orderMigrations) {
    if (!orderCols.some((c) => c.name === name)) {
      db.exec(sql);
    }
  }
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
