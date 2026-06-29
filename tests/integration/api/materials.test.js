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
  db.exec('DELETE FROM materials');
});

async function callGet() {
  const { GET } = require('../../../src/app/api/materials/route.js');
  return GET();
}

async function callPost(body) {
  const { POST } = require('../../../src/app/api/materials/route.js');
  return POST(
    new Request('http://localhost/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

async function callPatch(id, body) {
  const { PATCH } = require('../../../src/app/api/materials/[id]/route.js');
  return PATCH(
    new Request(`http://localhost/api/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { id } }
  );
}

async function callDelete(id) {
  const { DELETE } = require('../../../src/app/api/materials/[id]/route.js');
  return DELETE(new Request(`http://localhost/api/materials/${id}`, { method: 'DELETE' }), {
    params: { id },
  });
}

describe('POST /api/materials', () => {
  it('creates a material (201)', async () => {
    const res = await callPost({ name: 'Carton', currentStock: 100, minStock: 20, unit: 'foi' });
    expect(res.status).toBe(201);
    const { material } = await res.json();
    expect(material).toMatchObject({ name: 'Carton', currentStock: 100, minStock: 20, unit: 'foi' });
  });

  it('rejects empty name (400)', async () => {
    const res = await callPost({ name: '  ' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Numele materialului/);
  });

  it('rejects negative stock (400)', async () => {
    const res = await callPost({ name: 'Carton', currentStock: -5 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/număr pozitiv/);
  });
});

describe('GET /api/materials', () => {
  it('lists materials', async () => {
    await callPost({ name: 'Carton' });
    const res = await callGet();
    expect(res.status).toBe(200);
    const { materials } = await res.json();
    expect(materials).toHaveLength(1);
  });
});

describe('PATCH /api/materials/[id]', () => {
  it('updates a field', async () => {
    const { material } = await (await callPost({ name: 'Carton', currentStock: 100 })).json();
    const res = await callPatch(material.id, { currentStock: 50 });
    expect(res.status).toBe(200);
    expect((await res.json()).material.currentStock).toBe(50);
  });

  it('400 when no fields provided', async () => {
    const { material } = await (await callPost({ name: 'Carton' })).json();
    const res = await callPatch(material.id, {});
    expect(res.status).toBe(400);
  });

  it('404 for unknown id', async () => {
    const res = await callPatch('nope', { currentStock: 1 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/materials/[id]', () => {
  it('deletes a material', async () => {
    const { material } = await (await callPost({ name: 'Carton' })).json();
    const res = await callDelete(material.id);
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(true);
  });

  it('404 for unknown id', async () => {
    const res = await callDelete('nope');
    expect(res.status).toBe(404);
  });
});
