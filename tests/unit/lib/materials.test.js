'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const {
  listAll,
  getById,
  create,
  update,
  deleteById,
  isLowStock,
  lowStockMaterials,
} = require('../../../src/lib/materials.js');

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM materials');
});

describe('materials CRUD', () => {
  it('creates a material with all fields', () => {
    const m = create({ name: 'Carton', currentStock: 100, minStock: 20, unit: 'foi' });
    expect(m).toMatchObject({ name: 'Carton', currentStock: 100, minStock: 20, unit: 'foi' });
    expect(m.id).toBeTruthy();
  });

  it('defaults stocks to 0 and unit to null', () => {
    const m = create({ name: 'Ceară' });
    expect(m.currentStock).toBe(0);
    expect(m.minStock).toBe(0);
    expect(m.unit).toBeNull();
  });

  it('throws when name is empty', () => {
    expect(() => create({ name: '   ' })).toThrow('Numele materialului este obligatoriu.');
  });

  it('lists materials ordered by name', () => {
    create({ name: 'Satin' });
    create({ name: 'Carton' });
    expect(listAll().map((m) => m.name)).toEqual(['Carton', 'Satin']);
  });

  it('gets a material by id', () => {
    const m = create({ name: 'Carton' });
    expect(getById(m.id).name).toBe('Carton');
  });

  it('returns null for unknown id', () => {
    expect(getById('nope')).toBeNull();
  });

  it('updates a subset of fields', () => {
    const m = create({ name: 'Carton', currentStock: 100 });
    const updated = update(m.id, { currentStock: 80 });
    expect(updated.currentStock).toBe(80);
    expect(updated.name).toBe('Carton');
  });

  it('returns null updating unknown id', () => {
    expect(update('nope', { currentStock: 5 })).toBeNull();
  });

  it('returns null when no fields provided', () => {
    const m = create({ name: 'Carton' });
    expect(update(m.id, {})).toBeNull();
  });

  it('deletes a material', () => {
    const m = create({ name: 'Carton' });
    expect(deleteById(m.id)).toBe(true);
    expect(getById(m.id)).toBeNull();
  });

  it('returns false deleting unknown id', () => {
    expect(deleteById('nope')).toBe(false);
  });
});

describe('low-stock helpers', () => {
  it('isLowStock is true only strictly below minimum', () => {
    expect(isLowStock({ currentStock: 19, minStock: 20 })).toBe(true);
    expect(isLowStock({ currentStock: 20, minStock: 20 })).toBe(false); // equal is NOT low
    expect(isLowStock({ currentStock: 21, minStock: 20 })).toBe(false);
  });

  it('lowStockMaterials filters the below-threshold set', () => {
    const list = [
      { id: 'a', currentStock: 5, minStock: 10 },
      { id: 'b', currentStock: 10, minStock: 10 },
      { id: 'c', currentStock: 1, minStock: 2 },
    ];
    expect(lowStockMaterials(list).map((m) => m.id)).toEqual(['a', 'c']);
  });
});
