'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const { getAllWithStatus, createOrder, deleteOrder } = require('../../../src/lib/orders.js');

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM orders');
});

// ── getAllWithStatus ─────────────────────────────────────────────
describe('getAllWithStatus', () => {
  it('returns empty array when no orders exist', () => {
    expect(getAllWithStatus()).toEqual([]);
  });

  it('returns in_progres for order with no products', () => {
    createOrder('Nuntă Test');
    const [order] = getAllWithStatus();
    expect(order.status).toBe('in_progres');
    expect(order.productCount).toBe(0);
    expect(order.doneCount).toBe(0);
  });

  it('returns in_progres for order with mixed-status products', () => {
    const order = createOrder('Botez Test');
    db.prepare("INSERT INTO products (id, order_id, name, status, created_at) VALUES (?, ?, ?, ?, ?)").run(
      'p1', order.id, 'Invitații', 'gata', new Date().toISOString()
    );
    db.prepare("INSERT INTO products (id, order_id, name, status, created_at) VALUES (?, ?, ?, ?, ?)").run(
      'p2', order.id, 'Meniu', 'printare', new Date().toISOString()
    );
    const [found] = getAllWithStatus();
    expect(found.status).toBe('in_progres');
    expect(found.productCount).toBe(2);
    expect(found.doneCount).toBe(1);
  });

  it('returns finalizata when all products are in gata', () => {
    const order = createOrder('Gata Test');
    db.prepare("INSERT INTO products (id, order_id, name, status, created_at) VALUES (?, ?, ?, ?, ?)").run(
      'p3', order.id, 'Invitații', 'gata', new Date().toISOString()
    );
    db.prepare("INSERT INTO products (id, order_id, name, status, created_at) VALUES (?, ?, ?, ?, ?)").run(
      'p4', order.id, 'Meniu', 'gata', new Date().toISOString()
    );
    const [found] = getAllWithStatus();
    expect(found.status).toBe('finalizata');
    expect(found.productCount).toBe(2);
    expect(found.doneCount).toBe(2);
  });

  it('returns orders ordered by created_at DESC', () => {
    const now = Date.now();
    db.prepare("INSERT INTO orders (id, name, created_at) VALUES (?, ?, ?)").run('o-old', 'Old', new Date(now - 2000).toISOString());
    db.prepare("INSERT INTO orders (id, name, created_at) VALUES (?, ?, ?)").run('o-new', 'New', new Date(now).toISOString());
    const orders = getAllWithStatus();
    expect(orders[0].id).toBe('o-new');
    expect(orders[1].id).toBe('o-old');
  });

  it('response shape has all required fields', () => {
    createOrder('Shape Test');
    const [order] = getAllWithStatus();
    expect(order).toHaveProperty('id');
    expect(order).toHaveProperty('name');
    expect(order).toHaveProperty('status');
    expect(order).toHaveProperty('productCount');
    expect(order).toHaveProperty('doneCount');
    expect(order).toHaveProperty('createdAt');
  });
});

// ── createOrder ─────────────────────────────────────────────────
describe('createOrder', () => {
  it('creates an order and returns it with derived fields', () => {
    const order = createOrder('Nuntă Ionescu');
    expect(order.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(order.name).toBe('Nuntă Ionescu');
    expect(order.status).toBe('in_progres');
    expect(order.productCount).toBe(0);
    expect(order.doneCount).toBe(0);
    expect(order.createdAt).toBeTruthy();
  });
});

// ── deleteOrder ─────────────────────────────────────────────────
describe('deleteOrder', () => {
  it('removes the order and returns true', () => {
    const order = createOrder('Del Test');
    expect(deleteOrder(order.id)).toBe(true);
    expect(getAllWithStatus()).toHaveLength(0);
  });

  it('returns false for unknown id', () => {
    expect(deleteOrder('nonexistent-id')).toBe(false);
  });

  it('cascades to delete associated products', () => {
    const order = createOrder('Cascade Test');
    db.prepare("INSERT INTO products (id, order_id, name, status, created_at) VALUES (?, ?, ?, ?, ?)").run(
      'pc1', order.id, 'Invitații', 'de_facut', new Date().toISOString()
    );
    deleteOrder(order.id);
    const products = db.prepare('SELECT * FROM products WHERE order_id = ?').all(order.id);
    expect(products).toHaveLength(0);
  });
});
