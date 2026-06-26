'use strict';

// Mock db.js so all orders.js functions use an in-memory SQLite database.
jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const {
  getAll,
  getById,
  create,
  update,
  deleteOrder,
  getAllProductTypes,
  createProductType,
} = require('../../../src/lib/orders.js');

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM orders');
  db.exec("DELETE FROM product_types WHERE is_custom = 1");
});

// ── getAll ──────────────────────────────────────────────────────
describe('getAll', () => {
  it('returns empty array when no orders exist', () => {
    expect(getAll()).toEqual([]);
  });

  it('returns all orders sorted by eventDate ASC then createdAt ASC', () => {
    create({ primaryName: 'B', eventDate: '2026-09-01', eventType: 'nunta', productTypes: ['Invitații'], paymentStatus: 'neachitat' });
    create({ primaryName: 'A', eventDate: '2026-08-01', eventType: 'nunta', productTypes: ['Meniu'], paymentStatus: 'achitat_integral' });
    const orders = getAll();
    expect(orders[0].primaryName).toBe('A');
    expect(orders[1].primaryName).toBe('B');
  });

  it('filters by payment_status', () => {
    create({ primaryName: 'X', eventDate: '2026-08-01', eventType: 'nunta', productTypes: ['Invitații'], paymentStatus: 'neachitat' });
    create({ primaryName: 'Y', eventDate: '2026-08-02', eventType: 'nunta', productTypes: ['Meniu'], paymentStatus: 'achitat_integral' });
    const orders = getAll({ payment_status: 'neachitat' });
    expect(orders).toHaveLength(1);
    expect(orders[0].primaryName).toBe('X');
  });

  it('filters by event_date_from', () => {
    create({ primaryName: 'Early', eventDate: '2026-07-01', eventType: 'botez', productTypes: ['Plic'], paymentStatus: 'neachitat' });
    create({ primaryName: 'Late', eventDate: '2026-09-01', eventType: 'botez', productTypes: ['Plic'], paymentStatus: 'neachitat' });
    const orders = getAll({ event_date_from: '2026-08-01' });
    expect(orders).toHaveLength(1);
    expect(orders[0].primaryName).toBe('Late');
  });

  it('filters by event_date_to', () => {
    create({ primaryName: 'Early', eventDate: '2026-07-01', eventType: 'botez', productTypes: ['Plic'], paymentStatus: 'neachitat' });
    create({ primaryName: 'Late', eventDate: '2026-09-01', eventType: 'botez', productTypes: ['Plic'], paymentStatus: 'neachitat' });
    const orders = getAll({ event_date_to: '2026-07-31' });
    expect(orders).toHaveLength(1);
    expect(orders[0].primaryName).toBe('Early');
  });
});

// ── create ──────────────────────────────────────────────────────
describe('create', () => {
  it('inserts an order and returns camelCase entity', () => {
    const order = create({
      primaryName: 'Andrei Popescu',
      secondaryName: 'Maria Popescu',
      eventDate: '2026-08-15',
      eventType: 'nunta',
      productTypes: ['Invitații', 'Meniu'],
      paymentStatus: 'neachitat',
      notes: 'test',
    });
    expect(order.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(order.primaryName).toBe('Andrei Popescu');
    expect(order.secondaryName).toBe('Maria Popescu');
    expect(order.eventDate).toBe('2026-08-15');
    expect(order.eventType).toBe('nunta');
    expect(order.productTypes).toEqual(['Invitații', 'Meniu']);
    expect(order.paymentStatus).toBe('neachitat');
    expect(order.stage).toBe('de_facut');
    expect(order.notes).toBe('test');
    expect(order.createdAt).toBeTruthy();
    expect(order.updatedAt).toBeTruthy();
  });

  it('defaults stage to de_facut', () => {
    const order = create({ primaryName: 'X', eventDate: '2026-01-01', eventType: 'botez', productTypes: ['Plic'], paymentStatus: 'neachitat' });
    expect(order.stage).toBe('de_facut');
  });

  it('allows setting a custom stage', () => {
    const order = create({ primaryName: 'X', eventDate: '2026-01-01', eventType: 'botez', productTypes: ['Plic'], paymentStatus: 'neachitat', stage: 'printare' });
    expect(order.stage).toBe('printare');
  });

  it('sets secondaryName and notes to null when omitted', () => {
    const order = create({ primaryName: 'X', eventDate: '2026-01-01', eventType: 'nunta', productTypes: ['Meniu'], paymentStatus: 'achitat_integral' });
    expect(order.secondaryName).toBeNull();
    expect(order.notes).toBeNull();
  });
});

// ── getById ─────────────────────────────────────────────────────
describe('getById', () => {
  it('returns the order by id', () => {
    const created = create({ primaryName: 'Z', eventDate: '2026-05-01', eventType: 'nunta', productTypes: ['Program'], paymentStatus: 'avans_achitat' });
    const found = getById(created.id);
    expect(found).not.toBeNull();
    expect(found.id).toBe(created.id);
    expect(found.primaryName).toBe('Z');
  });

  it('returns null for unknown id', () => {
    expect(getById('nonexistent-id')).toBeNull();
  });
});

// ── update ──────────────────────────────────────────────────────
describe('update', () => {
  it('applies a partial patch', () => {
    const order = create({ primaryName: 'A', eventDate: '2026-01-01', eventType: 'nunta', productTypes: ['Meniu'], paymentStatus: 'neachitat' });
    const updated = update(order.id, { paymentStatus: 'achitat_integral' });
    expect(updated.paymentStatus).toBe('achitat_integral');
    expect(updated.primaryName).toBe('A');
  });

  it('updates stage for drag-and-drop move', () => {
    const order = create({ primaryName: 'A', eventDate: '2026-01-01', eventType: 'nunta', productTypes: ['Meniu'], paymentStatus: 'neachitat' });
    const moved = update(order.id, { stage: 'printare' });
    expect(moved.stage).toBe('printare');
  });

  it('sets updatedAt to a newer timestamp', (done) => {
    const order = create({ primaryName: 'A', eventDate: '2026-01-01', eventType: 'nunta', productTypes: ['Meniu'], paymentStatus: 'neachitat' });
    setTimeout(() => {
      const updated = update(order.id, { paymentStatus: 'avans_achitat' });
      expect(updated.updatedAt >= order.updatedAt).toBe(true);
      done();
    }, 5);
  });

  it('returns null for unknown id', () => {
    expect(update('nonexistent-id', { paymentStatus: 'neachitat' })).toBeNull();
  });

  it('returns current order unchanged when patch is empty', () => {
    const order = create({ primaryName: 'A', eventDate: '2026-01-01', eventType: 'nunta', productTypes: ['Meniu'], paymentStatus: 'neachitat' });
    const unchanged = update(order.id, {});
    expect(unchanged.primaryName).toBe('A');
  });
});

// ── deleteOrder ─────────────────────────────────────────────────
describe('deleteOrder', () => {
  it('removes the order and returns true', () => {
    const order = create({ primaryName: 'Del', eventDate: '2026-01-01', eventType: 'nunta', productTypes: ['Meniu'], paymentStatus: 'neachitat' });
    expect(deleteOrder(order.id)).toBe(true);
    expect(getById(order.id)).toBeNull();
  });

  it('returns false for unknown id', () => {
    expect(deleteOrder('nonexistent-id')).toBe(false);
  });
});

// ── product types ────────────────────────────────────────────────
describe('getAllProductTypes', () => {
  it('returns 7 seeded system product types', () => {
    const types = getAllProductTypes();
    expect(types.length).toBeGreaterThanOrEqual(7);
    const names = types.map((t) => t.name);
    expect(names).toContain('Invitații');
    expect(names).toContain('Altele');
  });

  it('includes isCustom: false for system types', () => {
    const types = getAllProductTypes();
    types.filter((t) => !t.isCustom).forEach((t) => {
      expect(t.isCustom).toBe(false);
    });
  });
});

describe('createProductType', () => {
  it('creates a custom product type', () => {
    const pt = createProductType('Felicitări');
    expect(pt.id).toBeTruthy();
    expect(pt.name).toBe('Felicitări');
    expect(pt.isCustom).toBe(true);
  });
});
