'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const { getAllWithStatus, getOrderById, createOrder, updateOrder, deleteOrder } = require('../../../src/lib/orders.js');

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
      'p1', order.id, 'Invitații', 'realizat', new Date().toISOString()
    );
    db.prepare("INSERT INTO products (id, order_id, name, status, created_at) VALUES (?, ?, ?, ?, ?)").run(
      'p2', order.id, 'Meniu', 'in_realizare', new Date().toISOString()
    );
    const [found] = getAllWithStatus();
    expect(found.status).toBe('in_progres');
    expect(found.productCount).toBe(2);
    expect(found.doneCount).toBe(1);
  });

  it('returns finalizata when all products are in realizat', () => {
    const order = createOrder('Realizat Test');
    db.prepare("INSERT INTO products (id, order_id, name, status, created_at) VALUES (?, ?, ?, ?, ?)").run(
      'p3', order.id, 'Invitații', 'realizat', new Date().toISOString()
    );
    db.prepare("INSERT INTO products (id, order_id, name, status, created_at) VALUES (?, ?, ?, ?, ?)").run(
      'p4', order.id, 'Meniu', 'realizat', new Date().toISOString()
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

// ── order metadata fields (feature 006) ─────────────────────────
describe('order metadata fields', () => {
  it('defaults new fields for a bare order', () => {
    const order = createOrder('Defaults Test');
    expect(order.client).toBeNull();
    // receptionDate auto-fills with today's date (YYYY-MM-DD) when not provided
    expect(order.receptionDate).toBe(new Date().toISOString().slice(0, 10));
    expect(order.advance).toBe(0);
    expect(order.county).toBeNull();
    expect(order.contactPlatform).toBeNull();
    expect(order.eventDate).toBeNull();
    expect(order.deliveryDate).toBeNull();
    expect(order.profit).toBe(0);
    expect(order.collected).toBe(false);
    expect(order.delivered).toBe(false);
  });

  it('persists fields passed to createOrder', () => {
    const order = createOrder('Create With Fields', {
      client: 'Maria Ionescu',
      advance: 500,
      county: 'Cluj',
      contactPlatform: 'Facebook',
      collected: true,
    });
    expect(order.client).toBe('Maria Ionescu');
    expect(order.advance).toBe(500);
    expect(order.county).toBe('Cluj');
    expect(order.contactPlatform).toBe('Facebook');
    expect(order.collected).toBe(true);
    expect(order.delivered).toBe(false);
  });

  it('coerces collected/delivered to booleans', () => {
    const order = createOrder('Bool Test', { collected: true, delivered: false });
    const found = getOrderById(order.id);
    expect(found.collected).toBe(true);
    expect(found.delivered).toBe(false);
  });
});

// ── updateOrder ─────────────────────────────────────────────────
describe('updateOrder', () => {
  it('updates provided fields and returns the order', () => {
    const order = createOrder('Update Test');
    const updated = updateOrder(order.id, { client: 'Ion Pop', profit: 150, delivered: true });
    expect(updated.client).toBe('Ion Pop');
    expect(updated.profit).toBe(150);
    expect(updated.delivered).toBe(true);
    expect(updated.collected).toBe(false);
  });

  it('returns null when no known fields are supplied', () => {
    const order = createOrder('No Fields Test');
    expect(updateOrder(order.id, {})).toBeNull();
    expect(updateOrder(order.id, { bogus: 1 })).toBeNull();
  });

  it('returns null for an unknown order id', () => {
    expect(updateOrder('nonexistent-id', { client: 'X' })).toBeNull();
  });

  it('clears a date field when set to empty string', () => {
    const order = createOrder('Clear Date', { eventDate: '2026-08-15' });
    expect(getOrderById(order.id).eventDate).toBe('2026-08-15');
    updateOrder(order.id, { eventDate: '' });
    expect(getOrderById(order.id).eventDate).toBeNull();
  });
});

// ── order total computation (feature 006) ───────────────────────
describe('order total', () => {
  it('is 0 for an order with no products', () => {
    createOrder('Empty Total');
    const [order] = getAllWithStatus();
    expect(order.total).toBe(0);
  });

  it('sums quantity × unit_price across products', () => {
    const order = createOrder('Total Test');
    db.prepare(
      'INSERT INTO products (id, order_id, name, status, quantity, unit_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('tp1', order.id, 'Invitații', 'de_realizat', 3, 50, new Date().toISOString());
    db.prepare(
      'INSERT INTO products (id, order_id, name, status, quantity, unit_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('tp2', order.id, 'Meniuri', 'de_realizat', 2, 120, new Date().toISOString());
    const found = getOrderById(order.id);
    expect(found.total).toBe(390); // 3×50 + 2×120
  });

  it('treats missing unit_price as 0', () => {
    const order = createOrder('Null Price');
    db.prepare(
      'INSERT INTO products (id, order_id, name, status, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('tp3', order.id, 'No Price', 'de_realizat', 5, new Date().toISOString());
    expect(getOrderById(order.id).total).toBe(0);
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
      'pc1', order.id, 'Invitații', 'de_realizat', new Date().toISOString()
    );
    deleteOrder(order.id);
    const products = db.prepare('SELECT * FROM products WHERE order_id = ?').all(order.id);
    expect(products).toHaveLength(0);
  });
});
