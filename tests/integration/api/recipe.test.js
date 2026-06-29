'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const { create: createMaterial } = require('../../../src/lib/materials.js');

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM recipe_lines');
  db.exec('DELETE FROM materials');
  db.exec('DELETE FROM product_templates');
});

function makeTemplate(name = 'Invitație') {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO product_templates (id, name, created_at) VALUES (?, ?, ?)').run(
    id,
    name,
    new Date().toISOString()
  );
  return id;
}

async function callGet(id) {
  const { GET } = require('../../../src/app/api/catalog/[id]/recipe/route.js');
  return GET(new Request(`http://localhost/api/catalog/${id}/recipe`), { params: { id } });
}

async function callPut(id, body) {
  const { PUT } = require('../../../src/app/api/catalog/[id]/recipe/route.js');
  return PUT(
    new Request(`http://localhost/api/catalog/${id}/recipe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { id } }
  );
}

describe('GET /api/catalog/[id]/recipe', () => {
  it('returns an empty recipe for a new template', async () => {
    const t = makeTemplate();
    const res = await callGet(t);
    expect(res.status).toBe(200);
    expect((await res.json()).recipe).toEqual([]);
  });

  it('404 for unknown template', async () => {
    const res = await callGet('nope');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/catalog/[id]/recipe', () => {
  it('saves a valid recipe and GET returns enriched lines', async () => {
    const t = makeTemplate();
    const carton = createMaterial({ name: 'Carton', unit: 'foi' });
    const satin = createMaterial({ name: 'Satin', unit: 'm' });
    const res = await callPut(t, {
      lines: [
        { materialId: carton.id, qtyPerPiece: 1 },
        { materialId: satin.id, qtyPerPiece: 0.2 },
      ],
    });
    expect(res.status).toBe(200);
    const got = await callGet(t);
    const { recipe } = await got.json();
    expect(recipe).toHaveLength(2);
    expect(recipe.find((l) => l.materialName === 'Carton')).toMatchObject({ qtyPerPiece: 1, unit: 'foi' });
  });

  it('rejects non-positive qtyPerPiece (400)', async () => {
    const t = makeTemplate();
    const m = createMaterial({ name: 'Carton' });
    const res = await callPut(t, { lines: [{ materialId: m.id, qtyPerPiece: 0 }] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Consumul per bucată/);
  });

  it('rejects duplicate material (400)', async () => {
    const t = makeTemplate();
    const m = createMaterial({ name: 'Carton' });
    const res = await callPut(t, {
      lines: [
        { materialId: m.id, qtyPerPiece: 1 },
        { materialId: m.id, qtyPerPiece: 2 },
      ],
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/de două ori/);
  });

  it('rejects unknown material (400)', async () => {
    const t = makeTemplate();
    const res = await callPut(t, { lines: [{ materialId: 'nope', qtyPerPiece: 1 }] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Material inexistent/);
  });

  it('404 for unknown template', async () => {
    const res = await callPut('nope', { lines: [] });
    expect(res.status).toBe(404);
  });
});
