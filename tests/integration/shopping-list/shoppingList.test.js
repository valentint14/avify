'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM recipe_lines');
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM product_templates');
  db.exec('DELETE FROM materials');
});

// ── date helpers ─────────────────────────────────────────────────────────────
function dateOffset(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ── insert helpers ────────────────────────────────────────────────────────────
function createOrder(name, { eventDate = null, deliveryDate = null } = {}) {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO orders (id, name, created_at, event_date, delivery_date) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, new Date().toISOString(), eventDate, deliveryDate);
  return id;
}

function createTemplate(name) {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO product_templates (id, name, created_at) VALUES (?, ?, ?)').run(
    id, name, new Date().toISOString()
  );
  return id;
}

function createMaterial(name, currentStock = 0, unit = null) {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO materials (id, name, current_stock, min_stock, unit, created_at) VALUES (?, ?, ?, 0, ?, ?)'
  ).run(id, name, currentStock, unit, new Date().toISOString());
  return id;
}

function createRecipeLine(templateId, materialId, qtyPerPiece) {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO recipe_lines (id, template_id, material_id, qty_per_piece, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, templateId, materialId, qtyPerPiece, new Date().toISOString());
}

function createProduct(orderId, name, templateId, quantity = 1, status = 'de_realizat') {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO products (id, order_id, name, status, template_id, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, orderId, name, status, templateId, quantity, new Date().toISOString());
  return id;
}

// ── tests ─────────────────────────────────────────────────────────────────────
const { getShoppingList } = require('../../../src/lib/shoppingList.js');

describe('getShoppingList()', () => {
  it('returns empty rows and excludedCount=0 when DB is empty', () => {
    const result = getShoppingList();
    expect(result.rows).toEqual([]);
    expect(result.excludedCount).toBe(0);
    expect(typeof result.generatedAt).toBe('string');
  });

  it('excludes orders outside the 30-day window (event_date > today+30)', () => {
    const tpl = createTemplate('Banner');
    const mat = createMaterial('Satin', 0);
    createRecipeLine(tpl, mat, 10);
    const orderId = createOrder('Comanda viitoare', { eventDate: dateOffset(31) });
    createProduct(orderId, 'Banner', tpl, 2);
    expect(getShoppingList().rows).toHaveLength(0);
    expect(getShoppingList().excludedCount).toBe(0);
  });

  it('excludes orders with no date set', () => {
    const tpl = createTemplate('Semn');
    const mat = createMaterial('Hartie', 0);
    createRecipeLine(tpl, mat, 5);
    const orderId = createOrder('Fara data');
    createProduct(orderId, 'Semn', tpl, 3);
    expect(getShoppingList().rows).toHaveLength(0);
  });

  it('includes order with event_date = today (in window)', () => {
    const tpl = createTemplate('Sticker');
    const mat = createMaterial('Folie', 0, 'cm');
    createRecipeLine(tpl, mat, 20);
    const orderId = createOrder('Comanda azi', { eventDate: dateOffset(0) });
    createProduct(orderId, 'Sticker', tpl, 3);
    const { rows } = getShoppingList();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalRequired).toBe(60);
    expect(rows[0].toBuy).toBe(60);
  });

  it('includes order using only delivery_date in window', () => {
    const tpl = createTemplate('Pliant');
    const mat = createMaterial('Hartie', 0, 'buc');
    createRecipeLine(tpl, mat, 5);
    const orderId = createOrder('Comanda livrare', { deliveryDate: dateOffset(15) });
    createProduct(orderId, 'Pliant', tpl, 4);
    const { rows } = getShoppingList();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalRequired).toBe(20);
  });

  it('includes order when only one of the two dates is in window', () => {
    const tpl = createTemplate('Invitatie');
    const mat = createMaterial('Carton', 0, 'buc');
    createRecipeLine(tpl, mat, 2);
    const orderId = createOrder('Comanda mixta', {
      eventDate: dateOffset(31),
      deliveryDate: dateOffset(10),
    });
    createProduct(orderId, 'Invitatie', tpl, 5);
    const { rows } = getShoppingList();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalRequired).toBe(10);
  });

  it('sums quantities across two orders using the same template and material', () => {
    const tpl = createTemplate('Semn de carte');
    const mat = createMaterial('Satin alb', 0, 'ml');
    createRecipeLine(tpl, mat, 50);
    const orderA = createOrder('Comanda A', { eventDate: dateOffset(5) });
    const orderB = createOrder('Comanda B', { deliveryDate: dateOffset(20) });
    createProduct(orderA, 'Semn', tpl, 3);
    createProduct(orderB, 'Semn', tpl, 2);
    const { rows } = getShoppingList();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalRequired).toBe(250); // (3+2) * 50
  });

  it('returns two rows for two different materials, sorted by name ASC', () => {
    const tpl = createTemplate('Covor');
    const matA = createMaterial('Zabala', 0, 'cm');
    const matB = createMaterial('Ata', 0, 'm');
    createRecipeLine(tpl, matA, 10);
    createRecipeLine(tpl, matB, 2);
    const orderId = createOrder('Comanda covor', { eventDate: dateOffset(7) });
    createProduct(orderId, 'Covor', tpl, 3);
    const { rows } = getShoppingList();
    expect(rows).toHaveLength(2);
    expect(rows[0].materialName).toBe('Ata');
    expect(rows[1].materialName).toBe('Zabala');
  });

  it('counts ad-hoc product (null template_id) in excludedCount', () => {
    const orderId = createOrder('Comanda adhoc', { eventDate: dateOffset(3) });
    createProduct(orderId, 'Produs adhoc', null, 2);
    const { rows, excludedCount } = getShoppingList();
    expect(rows).toHaveLength(0);
    expect(excludedCount).toBe(1);
  });

  it('counts template-linked product with no recipe in excludedCount', () => {
    const tpl = createTemplate('Template fara reteta');
    const orderId = createOrder('Comanda fara reteta', { deliveryDate: dateOffset(10) });
    createProduct(orderId, 'Produs', tpl, 1);
    const { rows, excludedCount } = getShoppingList();
    expect(rows).toHaveLength(0);
    expect(excludedCount).toBe(1);
  });

  it('excludes product with status="realizat" and does not count it as excluded', () => {
    const tpl = createTemplate('Album');
    const mat = createMaterial('Hartie groasa', 0);
    createRecipeLine(tpl, mat, 10);
    const orderId = createOrder('Comanda realizata', { eventDate: dateOffset(5) });
    createProduct(orderId, 'Album', tpl, 2, 'realizat');
    const { rows, excludedCount } = getShoppingList();
    expect(rows).toHaveLength(0);
    expect(excludedCount).toBe(0);
  });

  it('sets toBuy=0 when currentStock >= totalRequired', () => {
    const tpl = createTemplate('Sticker mic');
    const mat = createMaterial('Folie clara', 1000, 'cm');
    createRecipeLine(tpl, mat, 5);
    const orderId = createOrder('Comanda acoperita', { eventDate: dateOffset(1) });
    createProduct(orderId, 'Sticker', tpl, 4); // requires 20; stock 1000
    const { rows } = getShoppingList();
    expect(rows).toHaveLength(1);
    expect(rows[0].toBuy).toBe(0);
    expect(rows[0].totalRequired).toBe(20);
  });

  it('computes correct toBuy when stock is partial', () => {
    const tpl = createTemplate('Pliant A5');
    const mat = createMaterial('Hartie mata', 30, 'buc');
    createRecipeLine(tpl, mat, 10);
    const orderId = createOrder('Comanda partiala', { eventDate: dateOffset(2) });
    createProduct(orderId, 'Pliant', tpl, 5); // requires 50; stock 30 → toBuy 20
    const { rows } = getShoppingList();
    expect(rows[0].toBuy).toBe(20);
  });

  it('ignores recipe lines with qty_per_piece=0', () => {
    const tpl = createTemplate('Produs zero');
    const mat = createMaterial('Material zero', 0);
    createRecipeLine(tpl, mat, 0);
    const orderId = createOrder('Comanda zero', { eventDate: dateOffset(1) });
    createProduct(orderId, 'Produs', tpl, 5);
    const { rows, excludedCount } = getShoppingList();
    // Zero qty_per_piece lines are filtered; product has a template but all lines are 0 → NOT counted as excluded (it has a template, the recipe lines just don't contribute)
    expect(rows).toHaveLength(0);
    // Note: excluded count only counts products with no recipe lines at all (or null template)
    // A product with a template that has recipe lines but qty=0 is NOT in excludedCount
  });

  it('includes products with status="in_realizare" in calculation', () => {
    const tpl = createTemplate('Tricou');
    const mat = createMaterial('Bumbac', 0, 'g');
    createRecipeLine(tpl, mat, 100);
    const orderId = createOrder('Comanda in_realizare', { deliveryDate: dateOffset(7) });
    createProduct(orderId, 'Tricou', tpl, 2, 'in_realizare');
    const { rows } = getShoppingList();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalRequired).toBe(200);
  });
});
