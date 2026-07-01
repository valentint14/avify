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

async function createTemplate(name) {
  const { POST } = require('../../../src/app/api/catalog/route.js');
  const res = await POST(new Request('http://localhost/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }));
  return (await res.json()).template;
}

async function callPost(body) {
  const { POST } = require('../../../src/app/api/orders/route.js');
  return POST(new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('POST /api/orders with templateIds', () => {
  it('creates order with no products when templateIds is empty', async () => {
    const res = await callPost({ name: 'Empty Templates', templateIds: [] });
    expect(res.status).toBe(201);
    const { order, products } = await res.json();
    expect(order.name).toBe('Empty Templates');
    expect(products).toEqual([]);
    expect(order.productCount).toBe(0);
  });

  it('creates order and products from templateIds atomically', async () => {
    const t1 = await createTemplate('Invitație clasică');
    const t2 = await createTemplate('Meniu nuntă');

    const res = await callPost({ name: 'Nuntă Test', templateIds: [t1.id, t2.id] });
    expect(res.status).toBe(201);
    const { order, products } = await res.json();

    expect(order.name).toBe('Nuntă Test');
    expect(products).toHaveLength(2);
    expect(products.map((p) => p.name).sort()).toEqual(['Invitație clasică', 'Meniu nuntă'].sort());
    expect(products.every((p) => p.status === 'de_realizat')).toBe(true);
    expect(products.every((p) => p.orderId === order.id)).toBe(true);
    expect(products[0].templateId).toBeTruthy();
  });

  it('deduplicates templateIds — one product per template per order', async () => {
    const t = await createTemplate('Place card');
    const res = await callPost({ name: 'Duplicates', templateIds: [t.id, t.id] });
    expect(res.status).toBe(201);
    const { products } = await res.json();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Place card');
  });

  it('skips unknown templateIds silently', async () => {
    const t = await createTemplate('Mărturie');
    const res = await callPost({ name: 'Mixed', templateIds: [t.id, 'nonexistent-id'] });
    expect(res.status).toBe(201);
    const { products } = await res.json();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Mărturie');
  });

  it('backward compatible — no templateIds creates order with no products', async () => {
    const res = await callPost({ name: 'Backward Compat' });
    expect(res.status).toBe(201);
    const { order, products } = await res.json();
    expect(order.name).toBe('Backward Compat');
    expect(products).toEqual([]);
  });

  it('productCount on order reflects created products', async () => {
    const t1 = await createTemplate('Prod 1');
    const t2 = await createTemplate('Prod 2');
    const res = await callPost({ name: 'Count Test', templateIds: [t1.id, t2.id] });
    const { order } = await res.json();
    expect(order.productCount).toBe(2);
  });
});
