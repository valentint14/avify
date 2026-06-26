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
});

async function callGet() {
  const { GET } = require('../../../src/app/api/orders/route.js');
  return GET(new Request('http://localhost/api/orders'));
}

async function callPost(body) {
  const { POST } = require('../../../src/app/api/orders/route.js');
  return POST(new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

async function callDelete(id) {
  const { DELETE } = require('../../../src/app/api/orders/[id]/route.js');
  return DELETE(new Request(`http://localhost/api/orders/${id}`, { method: 'DELETE' }), { params: { id } });
}

// ── GET /api/orders ─────────────────────────────────────────────
describe('GET /api/orders', () => {
  it('returns 200 with empty orders array', async () => {
    const res = await callGet();
    expect(res.status).toBe(200);
    const { orders } = await res.json();
    expect(orders).toEqual([]);
  });

  it('returns orders with derived status fields', async () => {
    await callPost({ name: 'Test Order' });
    const res = await callGet();
    expect(res.status).toBe(200);
    const { orders } = await res.json();
    expect(orders).toHaveLength(1);
    const [order] = orders;
    expect(order).toHaveProperty('id');
    expect(order).toHaveProperty('name', 'Test Order');
    expect(order).toHaveProperty('status', 'in_progres');
    expect(order).toHaveProperty('productCount', 0);
    expect(order).toHaveProperty('doneCount', 0);
    expect(order).toHaveProperty('createdAt');
  });

  it('returns finalizata status when all products are gata', async () => {
    const createRes = await callPost({ name: 'Done Order' });
    const { order } = await createRes.json();
    db.prepare("INSERT INTO products (id, order_id, name, status, created_at) VALUES (?, ?, ?, ?, ?)").run(
      'p1', order.id, 'Invitații', 'gata', new Date().toISOString()
    );
    const getRes = await callGet();
    const { orders } = await getRes.json();
    expect(orders[0].status).toBe('finalizata');
    expect(orders[0].doneCount).toBe(1);
  });
});

// ── POST /api/orders ────────────────────────────────────────────
describe('POST /api/orders', () => {
  it('creates an order and returns 201', async () => {
    const res = await callPost({ name: 'Nuntă Popescu' });
    expect(res.status).toBe(201);
    const { order } = await res.json();
    expect(order.id).toBeTruthy();
    expect(order.name).toBe('Nuntă Popescu');
    expect(order.status).toBe('in_progres');
    expect(order.productCount).toBe(0);
  });

  it('returns 400 when name is missing', async () => {
    const res = await callPost({});
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  it('returns 400 when name is empty string', async () => {
    const res = await callPost({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is not a string', async () => {
    const res = await callPost({ name: 123 });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/orders/:id ──────────────────────────────────────
describe('DELETE /api/orders/:id', () => {
  it('deletes the order and returns 200 with {deleted:true}', async () => {
    const { order } = await (await callPost({ name: 'To Delete' })).json();
    const res = await callDelete(order.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });

  it('returns 404 for unknown id', async () => {
    const res = await callDelete('nonexistent');
    expect(res.status).toBe(404);
  });
});
