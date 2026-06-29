'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const { getRecipeForTemplate, replaceRecipe, getRecipesByTemplateIds } = require('../../../src/lib/recipes.js');
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

describe('replaceRecipe', () => {
  it('saves a recipe and returns enriched lines', () => {
    const t = makeTemplate();
    const carton = createMaterial({ name: 'Carton', unit: 'foi' });
    const satin = createMaterial({ name: 'Satin', unit: 'm' });
    const recipe = replaceRecipe(t, [
      { materialId: carton.id, qtyPerPiece: 1 },
      { materialId: satin.id, qtyPerPiece: 0.2 },
    ]);
    expect(recipe).toHaveLength(2);
    expect(recipe.find((l) => l.materialName === 'Satin')).toMatchObject({ qtyPerPiece: 0.2, unit: 'm' });
  });

  it('rejects qtyPerPiece <= 0', () => {
    const t = makeTemplate();
    const m = createMaterial({ name: 'Carton' });
    expect(() => replaceRecipe(t, [{ materialId: m.id, qtyPerPiece: 0 }])).toThrow(
      'Consumul per bucată trebuie să fie un număr pozitiv.'
    );
  });

  it('rejects unknown material', () => {
    const t = makeTemplate();
    expect(() => replaceRecipe(t, [{ materialId: 'nope', qtyPerPiece: 1 }])).toThrow('Material inexistent.');
  });

  it('rejects duplicate material in the same recipe', () => {
    const t = makeTemplate();
    const m = createMaterial({ name: 'Carton' });
    expect(() =>
      replaceRecipe(t, [
        { materialId: m.id, qtyPerPiece: 1 },
        { materialId: m.id, qtyPerPiece: 2 },
      ])
    ).toThrow('Un material nu poate apărea de două ori în rețetă.');
  });

  it('replaces the previous recipe (empty clears it)', () => {
    const t = makeTemplate();
    const m = createMaterial({ name: 'Carton' });
    replaceRecipe(t, [{ materialId: m.id, qtyPerPiece: 1 }]);
    expect(getRecipeForTemplate(t)).toHaveLength(1);
    replaceRecipe(t, []);
    expect(getRecipeForTemplate(t)).toHaveLength(0);
  });

  it('cascades: deleting a material removes its recipe lines', () => {
    const t = makeTemplate();
    const m = createMaterial({ name: 'Carton' });
    replaceRecipe(t, [{ materialId: m.id, qtyPerPiece: 1 }]);
    db.prepare('DELETE FROM materials WHERE id = ?').run(m.id);
    expect(getRecipeForTemplate(t)).toHaveLength(0);
  });
});

describe('getRecipesByTemplateIds', () => {
  it('builds a map keyed by template id', () => {
    const t1 = makeTemplate('A');
    const t2 = makeTemplate('B');
    const m = createMaterial({ name: 'Carton' });
    replaceRecipe(t1, [{ materialId: m.id, qtyPerPiece: 1 }]);
    replaceRecipe(t2, [{ materialId: m.id, qtyPerPiece: 3 }]);
    const map = getRecipesByTemplateIds([t1, t2, null]);
    expect(map[t1][0]).toMatchObject({ materialId: m.id, qtyPerPiece: 1 });
    expect(map[t2][0]).toMatchObject({ materialId: m.id, qtyPerPiece: 3 });
  });

  it('returns empty object for no ids', () => {
    expect(getRecipesByTemplateIds([])).toEqual({});
  });
});
