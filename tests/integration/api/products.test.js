'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

let db;
let orderId;

beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM product_templates');
  db.exec('DELETE FROM orders');
  // Seed a test order
  const now = new Date().toISOString();
  orderId = crypto.randomUUID();
  db.prepare('INSERT INTO orders (id, name, created_at) VALUES (?, ?, ?)').run(orderId, 'Test Order', now);
});

async function callGetProducts(orderIdParam) {
  const { GET } = require('../../../src/app/api/products/route.js');
  const url = orderIdParam ? `http://localhost/api/products?orderId=${orderIdParam}` : 'http://localhost/api/products';
  return GET(new Request(url));
}

async function callPostProduct(body) {
  const { POST } = require('../../../src/app/api/products/route.js');
  return POST(new Request('http://localhost/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

async function callPatch(id, body) {
  const { PATCH } = require('../../../src/app/api/products/[id]/route.js');
  return PATCH(new Request(`http://localhost/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), { params: { id } });
}

async function callDeleteProduct(id) {
  const { DELETE } = require('../../../src/app/api/products/[id]/route.js');
  return DELETE(new Request(`http://localhost/api/products/${id}`, { method: 'DELETE' }), { params: { id } });
}

// ── GET /api/products?orderId= ───────────────────────────────────
describe('GET /api/products', () => {
  it('returns 200 with empty products array', async () => {
    const res = await callGetProducts(orderId);
    expect(res.status).toBe(200);
    const { products } = await res.json();
    expect(products).toEqual([]);
  });

  it('returns 400 when orderId is missing', async () => {
    const res = await callGetProducts(null);
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  it('returns products for the given order', async () => {
    await callPostProduct({ orderId, name: 'Invitații' });
    const res = await callGetProducts(orderId);
    const { products } = await res.json();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Invitații');
  });
});

// ── POST /api/products ───────────────────────────────────────────
describe('POST /api/products', () => {
  it('creates a product and returns 201', async () => {
    const res = await callPostProduct({ orderId, name: 'Meniu' });
    expect(res.status).toBe(201);
    const { product } = await res.json();
    expect(product.id).toBeTruthy();
    expect(product.orderId).toBe(orderId);
    expect(product.name).toBe('Meniu');
    expect(product.status).toBe('de_facut');
  });

  it('returns 400 when name is empty', async () => {
    const res = await callPostProduct({ orderId, name: '' });
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  it('returns 400 when orderId is missing', async () => {
    const res = await callPostProduct({ name: 'Invitații' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when orderId does not exist', async () => {
    const res = await callPostProduct({ orderId: 'nonexistent', name: 'Invitații' });
    expect(res.status).toBe(404);
  });

  it('creates product with custom quantity and additionalInfo', async () => {
    const res = await callPostProduct({ orderId, name: 'Tricou', quantity: 3, additionalInfo: 'Font Arial' });
    expect(res.status).toBe(201);
    const { product } = await res.json();
    expect(product.quantity).toBe(3);
    expect(product.additionalInfo).toBe('Font Arial');
  });

  it('returns 400 when quantity is 0', async () => {
    const res = await callPostProduct({ orderId, name: 'Tricou', quantity: 0 });
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toMatch(/cantitatea/i);
  });

  it('returns 400 when quantity is negative', async () => {
    const res = await callPostProduct({ orderId, name: 'Tricou', quantity: -1 });
    expect(res.status).toBe(400);
  });

  it('returns 409 when same templateId is added to same order twice', async () => {
    const templateId = crypto.randomUUID();
    db.prepare('INSERT INTO product_templates (id, name, created_at) VALUES (?, ?, ?)').run(templateId, 'Tricou', new Date().toISOString());
    await callPostProduct({ orderId, name: 'Tricou', templateId });
    const res = await callPostProduct({ orderId, name: 'Tricou', templateId });
    expect(res.status).toBe(409);
    const { error } = await res.json();
    expect(error).toMatch(/există deja/i);
  });
});

// ── PATCH /api/products/:id ──────────────────────────────────────
describe('PATCH /api/products/:id', () => {
  it('updates status and returns 200 with updated product', async () => {
    const { product: created } = await (await callPostProduct({ orderId, name: 'Invitații' })).json();
    const res = await callPatch(created.id, { status: 'printare' });
    expect(res.status).toBe(200);
    const { product } = await res.json();
    expect(product.status).toBe('printare');
    expect(product.id).toBe(created.id);
  });

  it('returns 400 for invalid status', async () => {
    const { product: created } = await (await callPostProduct({ orderId, name: 'Meniu' })).json();
    const res = await callPatch(created.id, { status: 'invalid-status' });
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  it('returns 404 for unknown product id', async () => {
    const res = await callPatch('nonexistent', { status: 'gata' });
    expect(res.status).toBe(404);
  });

  it('accepts all 6 valid statuses', async () => {
    const validStatuses = ['de_facut', 'in_design', 'validare_client', 'printare', 'asamblare', 'gata'];
    for (const status of validStatuses) {
      const { product: created } = await (await callPostProduct({ orderId, name: `P-${status}` })).json();
      const res = await callPatch(created.id, { status });
      expect(res.status).toBe(200);
    }
  });

  it('updates quantity and returns updated product', async () => {
    const { product: created } = await (await callPostProduct({ orderId, name: 'Qty Product' })).json();
    const res = await callPatch(created.id, { quantity: 5 });
    expect(res.status).toBe(200);
    const { product } = await res.json();
    expect(product.quantity).toBe(5);
  });

  it('clears additionalInfo when set to null', async () => {
    const { product: created } = await (await callPostProduct({ orderId, name: 'Info Product', additionalInfo: 'test' })).json();
    const res = await callPatch(created.id, { additionalInfo: null });
    expect(res.status).toBe(200);
    const { product } = await res.json();
    expect(product.additionalInfo).toBeNull();
  });

  it('returns 400 when quantity is 0', async () => {
    const { product: created } = await (await callPostProduct({ orderId, name: 'Bad Qty' })).json();
    const res = await callPatch(created.id, { quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is empty', async () => {
    const { product: created } = await (await callPostProduct({ orderId, name: 'Empty Body' })).json();
    const res = await callPatch(created.id, {});
    expect(res.status).toBe(400);
  });

  it('updates both status and quantity in one request', async () => {
    const { product: created } = await (await callPostProduct({ orderId, name: 'Both Fields' })).json();
    const res = await callPatch(created.id, { status: 'printare', quantity: 2 });
    expect(res.status).toBe(200);
    const { product } = await res.json();
    expect(product.status).toBe('printare');
    expect(product.quantity).toBe(2);
  });
});

// ── DELETE /api/products/:id ─────────────────────────────────────
describe('DELETE /api/products/:id', () => {
  it('deletes the product and returns 200', async () => {
    const { product } = await (await callPostProduct({ orderId, name: 'Del Product' })).json();
    const res = await callDeleteProduct(product.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });

  it('returns 404 for unknown id', async () => {
    const res = await callDeleteProduct('nonexistent');
    expect(res.status).toBe(404);
  });
});
