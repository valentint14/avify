'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const {
  listAll,
  search,
  getById,
  create,
  update,
  deleteById,
} = require('../../../src/lib/productTemplates.js');

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM product_templates');
});

// ── listAll ──────────────────────────────────────────────────────
describe('listAll', () => {
  it('returns empty array when catalog is empty', () => {
    expect(listAll()).toEqual([]);
  });

  it('returns all templates ordered by name ASC', () => {
    create('Meniu', null);
    create('Invitație clasică', 'Desc');
    const templates = listAll();
    expect(templates).toHaveLength(2);
    expect(templates[0].name).toBe('Invitație clasică');
    expect(templates[1].name).toBe('Meniu');
  });

  it('response shape has all required fields', () => {
    create('Place card', 'Mic cartonaș');
    const [t] = listAll();
    expect(t).toHaveProperty('id');
    expect(t).toHaveProperty('name', 'Place card');
    expect(t).toHaveProperty('description', 'Mic cartonaș');
    expect(t).toHaveProperty('createdAt');
  });
});

// ── search ───────────────────────────────────────────────────────
describe('search', () => {
  beforeEach(() => {
    create('Invitație clasică', null);
    create('Invitație modernă', null);
    create('Meniu nuntă', null);
  });

  it('returns all when query is empty string', () => {
    expect(search('')).toHaveLength(3);
  });

  it('filters by partial name match case-insensitively', () => {
    const results = search('invit');
    expect(results).toHaveLength(2);
    expect(results.every((t) => t.name.toLowerCase().includes('invit'))).toBe(true);
  });

  it('returns empty array when no match', () => {
    expect(search('nonexistent')).toEqual([]);
  });
});

// ── getById ──────────────────────────────────────────────────────
describe('getById', () => {
  it('returns template when found', () => {
    const t = create('Mărturie', null);
    const found = getById(t.id);
    expect(found).not.toBeNull();
    expect(found.id).toBe(t.id);
    expect(found.name).toBe('Mărturie');
  });

  it('returns null for unknown id', () => {
    expect(getById('nonexistent-id')).toBeNull();
  });
});

// ── create ───────────────────────────────────────────────────────
describe('create', () => {
  it('creates template with name only', () => {
    const t = create('Invitație', null);
    expect(t.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(t.name).toBe('Invitație');
    expect(t.description).toBeNull();
    expect(t.createdAt).toBeTruthy();
  });

  it('creates template with name and description', () => {
    const t = create('Meniu', 'Meniu tipărit');
    expect(t.name).toBe('Meniu');
    expect(t.description).toBe('Meniu tipărit');
  });

  it('throws or returns null when name is empty', () => {
    expect(() => create('', null)).toThrow();
  });

  it('throws or returns null when name is whitespace only', () => {
    expect(() => create('   ', null)).toThrow();
  });
});

// ── update ───────────────────────────────────────────────────────
describe('update', () => {
  it('updates name', () => {
    const t = create('Old Name', null);
    const updated = update(t.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
    expect(updated.id).toBe(t.id);
  });

  it('updates description', () => {
    const t = create('Test', null);
    const updated = update(t.id, { description: 'New desc' });
    expect(updated.description).toBe('New desc');
    expect(updated.name).toBe('Test');
  });

  it('updates both name and description', () => {
    const t = create('Old', 'Old desc');
    const updated = update(t.id, { name: 'New', description: 'New desc' });
    expect(updated.name).toBe('New');
    expect(updated.description).toBe('New desc');
  });

  it('returns null for unknown id', () => {
    expect(update('nonexistent', { name: 'X' })).toBeNull();
  });

  it('throws when updating to empty name', () => {
    const t = create('Test', null);
    expect(() => update(t.id, { name: '' })).toThrow();
  });
});

// ── deleteById ───────────────────────────────────────────────────
describe('deleteById', () => {
  it('removes template and returns true', () => {
    const t = create('To Delete', null);
    expect(deleteById(t.id)).toBe(true);
    expect(getById(t.id)).toBeNull();
  });

  it('returns false for unknown id', () => {
    expect(deleteById('nonexistent-id')).toBe(false);
  });
});
