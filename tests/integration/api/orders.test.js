'use strict';

// All API routes will use this in-memory database.
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
  db.exec('DELETE FROM orders');
});

// Helper: build a minimal valid order payload
const validPayload = (overrides = {}) => ({
  primaryName: 'Test Client',
  eventDate: '2026-09-01',
  eventType: 'nunta',
  productTypes: ['Invitații'],
  paymentStatus: 'neachitat',
  ...overrides,
});

async function callGet(url) {
  const { GET } = require('../../../src/app/api/orders/route.js');
  return GET(new Request(`http://localhost${url}`));
}

async function callPost(body) {
  const { POST } = require('../../../src/app/api/orders/route.js');
  return POST(new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

async function callGetById(id) {
  const { GET } = require('../../../src/app/api/orders/[id]/route.js');
  return GET(new Request(`http://localhost/api/orders/${id}`), { params: { id } });
}

async function callPut(id, body) {
  const { PUT } = require('../../../src/app/api/orders/[id]/route.js');
  return PUT(new Request(`http://localhost/api/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), { params: { id } });
}

async function callDelete(id) {
  const { DELETE } = require('../../../src/app/api/orders/[id]/route.js');
  return DELETE(new Request(`http://localhost/api/orders/${id}`, { method: 'DELETE' }), { params: { id } });
}

// ── GET /api/orders ─────────────────────────────────────────────
describe('GET /api/orders', () => {
  it('returns 200 with empty orders array', async () => {
    const res = await callGet('/api/orders');
    expect(res.status).toBe(200);
    const { orders } = await res.json();
    expect(orders).toEqual([]);
  });

  it('returns all created orders', async () => {
    await callPost(validPayload({ primaryName: 'First' }));
    await callPost(validPayload({ primaryName: 'Second' }));
    const res = await callGet('/api/orders');
    const { orders } = await res.json();
    expect(orders).toHaveLength(2);
  });
});

// ── POST /api/orders ────────────────────────────────────────────
describe('POST /api/orders', () => {
  it('creates an order and returns 201', async () => {
    const res = await callPost(validPayload());
    expect(res.status).toBe(201);
    const { order } = await res.json();
    expect(order.id).toBeTruthy();
    expect(order.primaryName).toBe('Test Client');
    expect(order.stage).toBe('de_facut');
  });

  it('returns 400 when primaryName is missing', async () => {
    const res = await callPost(validPayload({ primaryName: '' }));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  it('returns 400 when eventDate is missing', async () => {
    const res = await callPost(validPayload({ eventDate: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for unknown eventType', async () => {
    const res = await callPost(validPayload({ eventType: 'craciun' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when productTypes is empty', async () => {
    const res = await callPost(validPayload({ productTypes: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid paymentStatus', async () => {
    const res = await callPost(validPayload({ paymentStatus: 'partial' }));
    expect(res.status).toBe(400);
  });
});

// ── GET /api/orders/:id ─────────────────────────────────────────
describe('GET /api/orders/:id', () => {
  it('returns 200 with the order', async () => {
    const createRes = await callPost(validPayload());
    const { order: created } = await createRes.json();
    const res = await callGetById(created.id);
    expect(res.status).toBe(200);
    const { order } = await res.json();
    expect(order.id).toBe(created.id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await callGetById('nonexistent');
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/orders/:id ─────────────────────────────────────────
describe('PUT /api/orders/:id', () => {
  it('partially updates and returns 200', async () => {
    const { order: created } = await (await callPost(validPayload())).json();
    const res = await callPut(created.id, { paymentStatus: 'achitat_integral' });
    expect(res.status).toBe(200);
    const { order } = await res.json();
    expect(order.paymentStatus).toBe('achitat_integral');
    expect(order.primaryName).toBe('Test Client');
  });

  it('updates stage (drag-and-drop)', async () => {
    const { order: created } = await (await callPost(validPayload())).json();
    const res = await callPut(created.id, { stage: 'printare' });
    const { order } = await res.json();
    expect(order.stage).toBe('printare');
  });

  it('returns 404 for unknown id', async () => {
    const res = await callPut('nonexistent', { paymentStatus: 'neachitat' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid stage', async () => {
    const { order: created } = await (await callPost(validPayload())).json();
    const res = await callPut(created.id, { stage: 'invalid-stage' });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/orders/:id ──────────────────────────────────────
describe('DELETE /api/orders/:id', () => {
  it('deletes the order and returns 200', async () => {
    const { order: created } = await (await callPost(validPayload())).json();
    const res = await callDelete(created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const getRes = await callGetById(created.id);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await callDelete('nonexistent');
    expect(res.status).toBe(404);
  });
});
