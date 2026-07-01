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
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM product_templates');
});

function createOrder(name) {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO orders (id, name, created_at) VALUES (?, ?, ?)').run(
    id, name, new Date().toISOString()
  );
  return id;
}

function createTemplate(name) {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO product_templates (id, name, created_at) VALUES (?, ?, ?)').run(
    id, name, new Date().toISOString()
  );
  return id;
}

function createProduct(orderId, name, templateId, quantity, status = 'de_realizat') {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO products (id, order_id, name, status, template_id, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, orderId, name, status, templateId, quantity, new Date().toISOString());
  return id;
}

const { getProductionQueue } = require('../../../src/lib/productionQueue.js');

describe('getProductionQueue()', () => {
  it('returns [] when no de_realizat products exist', () => {
    expect(getProductionQueue()).toEqual([]);
  });

  it('returns [] when all products are not de_realizat', () => {
    const orderA = createOrder('Comanda A');
    const orderB = createOrder('Comanda B');
    const templateId = createTemplate('Banner');
    createProduct(orderA, 'Banner', templateId, 3, 'realizat');
    createProduct(orderB, 'Banner', templateId, 2, 'in_realizare');
    expect(getProductionQueue()).toEqual([]);
  });

  it('groups a single template product with correct label and quantity', () => {
    const orderId = createOrder('Comanda A');
    const templateId = createTemplate('Invitație');
    createProduct(orderId, 'Invitație', templateId, 5);

    const result = getProductionQueue();
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Invitație');
    expect(result[0].templateId).toBe(templateId);
    expect(result[0].totalQuantity).toBe(5);
    expect(result[0].orders).toHaveLength(1);
    expect(result[0].orders[0].quantity).toBe(5);
    expect(result[0].orders[0].orderName).toBe('Comanda A');
  });

  it('sums quantities across two orders with the same template', () => {
    const templateId = createTemplate('Banner PVC');
    const orderA = createOrder('Comanda A');
    const orderB = createOrder('Comanda B');
    createProduct(orderA, 'Banner PVC', templateId, 3);
    createProduct(orderB, 'Banner PVC', templateId, 5);

    const result = getProductionQueue();
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Banner PVC');
    expect(result[0].totalQuantity).toBe(8);
    expect(result[0].orders).toHaveLength(2);
    const quantities = result[0].orders.map((o) => o.quantity).sort((a, b) => a - b);
    expect(quantities).toEqual([3, 5]);
  });

  it('produces two groups for two different templates, sorted by quantity desc', () => {
    const t1 = createTemplate('Meniu');
    const t2 = createTemplate('Invitație');
    const orderId = createOrder('Comanda A');
    createProduct(orderId, 'Meniu', t1, 2);
    createProduct(orderId, 'Invitație', t2, 7);

    const result = getProductionQueue();
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('Invitație');
    expect(result[0].totalQuantity).toBe(7);
    expect(result[1].label).toBe('Meniu');
    expect(result[1].totalQuantity).toBe(2);
  });

  it('groups ad-hoc product (null template_id) by product name', () => {
    const orderId = createOrder('Comanda X');
    createProduct(orderId, 'Plic personalizat', null, 4);

    const result = getProductionQueue();
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Plic personalizat');
    expect(result[0].templateId).toBeNull();
    expect(result[0].key).toBe('ad_hoc_Plic personalizat');
    expect(result[0].totalQuantity).toBe(4);
  });

  it('handles mixed template and ad-hoc products in correct sort order', () => {
    const templateId = createTemplate('Banner');
    const orderId = createOrder('Comanda A');
    createProduct(orderId, 'Banner', templateId, 3);
    createProduct(orderId, 'Plic', null, 10);

    const result = getProductionQueue();
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('Plic');
    expect(result[0].totalQuantity).toBe(10);
    expect(result[1].label).toBe('Banner');
    expect(result[1].totalQuantity).toBe(3);
  });

  it('includes client from order in contributing orders', () => {
    const orderId = createOrder('Comanda Maria');
    db.prepare('UPDATE orders SET client = ? WHERE id = ?').run('Maria Ionescu', orderId);
    createProduct(orderId, 'Produs', null, 2);

    const result = getProductionQueue();
    expect(result[0].orders[0].client).toBe('Maria Ionescu');
  });

  it('client is null when not set on order', () => {
    const orderId = createOrder('Comanda fără client');
    createProduct(orderId, 'Produs', null, 1);

    const result = getProductionQueue();
    expect(result[0].orders[0].client).toBeNull();
  });
});
