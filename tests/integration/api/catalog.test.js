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

async function callGet(q) {
  const { GET } = require('../../../src/app/api/catalog/route.js');
  const url = q ? `http://localhost/api/catalog?q=${encodeURIComponent(q)}` : 'http://localhost/api/catalog';
  return GET(new Request(url));
}

async function callPost(body) {
  const { POST } = require('../../../src/app/api/catalog/route.js');
  return POST(new Request('http://localhost/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

async function callPatch(id, body) {
  const { PATCH } = require('../../../src/app/api/catalog/[id]/route.js');
  return PATCH(
    new Request(`http://localhost/api/catalog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { id } }
  );
}

async function callDelete(id) {
  const { DELETE } = require('../../../src/app/api/catalog/[id]/route.js');
  return DELETE(
    new Request(`http://localhost/api/catalog/${id}`, { method: 'DELETE' }),
    { params: { id } }
  );
}

// ── GET /api/catalog ────────────────────────────────────────────
describe('GET /api/catalog', () => {
  it('returns 200 with empty templates array', async () => {
    const res = await callGet();
    expect(res.status).toBe(200);
    const { templates } = await res.json();
    expect(templates).toEqual([]);
  });

  it('returns all templates ordered by name', async () => {
    await callPost({ name: 'Meniu' });
    await callPost({ name: 'Invitație clasică' });
    const res = await callGet();
    const { templates } = await res.json();
    expect(templates).toHaveLength(2);
    expect(templates[0].name).toBe('Invitație clasică');
    expect(templates[1].name).toBe('Meniu');
  });

  it('filters by ?q= parameter', async () => {
    await callPost({ name: 'Invitație clasică' });
    await callPost({ name: 'Meniu nuntă' });
    const res = await callGet('invit');
    const { templates } = await res.json();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Invitație clasică');
  });

  it('template shape has all required fields', async () => {
    await callPost({ name: 'Place card', description: 'Cartonaș' });
    const { templates } = await (await callGet()).json();
    const [t] = templates;
    expect(t).toHaveProperty('id');
    expect(t).toHaveProperty('name', 'Place card');
    expect(t).toHaveProperty('description', 'Cartonaș');
    expect(t).toHaveProperty('createdAt');
  });
});

// ── POST /api/catalog ───────────────────────────────────────────
describe('POST /api/catalog', () => {
  it('creates template and returns 201', async () => {
    const res = await callPost({ name: 'Mărturie', description: 'Cutie mică' });
    expect(res.status).toBe(201);
    const { template } = await res.json();
    expect(template.id).toBeTruthy();
    expect(template.name).toBe('Mărturie');
    expect(template.description).toBe('Cutie mică');
  });

  it('creates template without description', async () => {
    const res = await callPost({ name: 'Invitație' });
    expect(res.status).toBe(201);
    const { template } = await res.json();
    expect(template.description).toBeNull();
  });

  it('returns 400 when name is missing', async () => {
    const res = await callPost({});
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  it('returns 400 when name is empty string', async () => {
    const res = await callPost({ name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is whitespace only', async () => {
    const res = await callPost({ name: '   ' });
    expect(res.status).toBe(400);
  });
});

// ── PATCH /api/catalog/:id ──────────────────────────────────────
describe('PATCH /api/catalog/:id', () => {
  it('updates name and returns 200', async () => {
    const { template } = await (await callPost({ name: 'Old' })).json();
    const res = await callPatch(template.id, { name: 'New Name' });
    expect(res.status).toBe(200);
    const { template: updated } = await res.json();
    expect(updated.name).toBe('New Name');
  });

  it('updates description', async () => {
    const { template } = await (await callPost({ name: 'Test' })).json();
    const res = await callPatch(template.id, { description: 'New desc' });
    expect(res.status).toBe(200);
    const { template: updated } = await res.json();
    expect(updated.description).toBe('New desc');
    expect(updated.name).toBe('Test');
  });

  it('returns 404 for unknown id', async () => {
    const res = await callPatch('nonexistent', { name: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when name is empty', async () => {
    const { template } = await (await callPost({ name: 'Test' })).json();
    const res = await callPatch(template.id, { name: '' });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/catalog/:id ─────────────────────────────────────
describe('DELETE /api/catalog/:id', () => {
  it('deletes template and returns 204', async () => {
    const { template } = await (await callPost({ name: 'To Delete' })).json();
    const res = await callDelete(template.id);
    expect(res.status).toBe(204);
  });

  it('returns 404 for unknown id', async () => {
    const res = await callDelete('nonexistent');
    expect(res.status).toBe(404);
  });

  it('deleted template no longer appears in GET', async () => {
    const { template } = await (await callPost({ name: 'Delete Me' })).json();
    await callDelete(template.id);
    const { templates } = await (await callGet()).json();
    expect(templates).toHaveLength(0);
  });
});
